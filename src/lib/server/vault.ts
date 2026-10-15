import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { parseMarkdown, serializeMarkdown } from '#lib/editor/markdown.ts';
import type { DocInfo, SaveRequest, SaveResponse, TabContent, TabInfo } from '#lib/types.ts';
import { joinFrontmatter, readMeta, setMeta, splitFrontmatter } from './frontmatter';

export class VaultError extends Error {
	constructor(
		message: string,
		readonly status: 400 | 404 | 409
	) {
		super(message);
	}
}

const DOC_FILE = '_doc.md';

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Judul bebas → nama file aman. "Bab 1: Pendahuluan" → "bab-1-pendahuluan" */
export function slugify(title: string): string {
	const slug = title
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 50)
		.replace(/-+$/, '');
	return slug || 'tanpa-judul';
}

function checkSegment(name: string): string {
	if (!name || name.startsWith('.') || /[/\\\0]/.test(name) || name === '_doc') {
		throw new VaultError('Nama nggak valid', 400);
	}
	return name;
}

/** Bentuk yang dihasilkan serializer: tanpa baris kosong di awal, satu newline di akhir. */
const normalizeBody = (body: string) => {
	const t = body.replace(/^(?:[ \t]*\r?\n)+/, '').trimEnd();
	return t ? t + '\n' : '';
};

/** `onChange` dipanggil dengan path relatif vault tiap ada file berubah (buat commit Git). */
export function createVault(root: string, onChange: (label: string) => void = () => {}) {
	const docsDir = join(root, 'docs');

	function docDir(doc: string): string {
		const dir = resolve(docsDir, checkSegment(doc));
		if (!dir.startsWith(docsDir + sep)) throw new VaultError('Nama nggak valid', 400);
		return dir;
	}

	const tabPath = (doc: string, tab: string) => join(docDir(doc), `${checkSegment(tab)}.md`);

	async function readText(path: string): Promise<string> {
		try {
			return await readFile(path, 'utf8');
		} catch {
			throw new VaultError('Nggak ketemu', 404);
		}
	}

	async function writeAtomic(path: string, content: string, label: string): Promise<void> {
		const tmp = `${path}.${process.pid}.tmp`;
		await writeFile(tmp, content, 'utf8');
		await rename(tmp, path);
		onChange(label);
	}

	async function readDocMeta(doc: string) {
		const path = join(docDir(doc), DOC_FILE);
		const src = existsSync(path) ? await readFile(path, 'utf8') : '';
		const split = splitFrontmatter(src);
		return { path, src, split, meta: readMeta(split.frontmatter) };
	}

	async function listTabs(doc: string, order: string[] = []): Promise<TabInfo[]> {
		const files = (await readdir(docDir(doc)))
			.filter((f) => f.endsWith('.md') && f !== DOC_FILE && !f.startsWith('.'))
			.map((f) => f.slice(0, -3))
			.sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
		const ordered = [
			...order.filter((t) => files.includes(t)),
			...files.filter((t) => !order.includes(t))
		];
		return Promise.all(
			ordered.map(async (slug) => {
				const { frontmatter } = splitFrontmatter(await readFile(tabPath(doc, slug), 'utf8'));
				return { slug, title: readMeta(frontmatter).title ?? slug };
			})
		);
	}

	async function getDoc(doc: string): Promise<DocInfo> {
		if (!existsSync(docDir(doc))) throw new VaultError('Dokumen nggak ketemu', 404);
		const { meta } = await readDocMeta(doc);
		return { slug: doc, title: meta.title ?? doc, tabs: await listTabs(doc, meta.tabs) };
	}

	async function listDocs(): Promise<DocInfo[]> {
		await mkdir(docsDir, { recursive: true });
		const entries = await readdir(docsDir, { withFileTypes: true });
		const docs = await Promise.all(
			entries.filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => getDoc(e.name))
		);
		return docs.sort((a, b) => a.title.localeCompare(b.title, 'id', { numeric: true }));
	}

	async function readTab(doc: string, tab: string): Promise<TabContent> {
		const src = await readText(tabPath(doc, tab));
		const { frontmatter, body } = splitFrontmatter(src);
		const meta = readMeta(frontmatter);
		return {
			doc,
			tab,
			title: meta.title ?? tab,
			frontmatter,
			body,
			enums: meta.enums,
			hash: sha256(src),
			lossy: serializeMarkdown(parseMarkdown(body)) !== normalizeBody(body)
		};
	}

	async function saveTab(doc: string, tab: string, req: SaveRequest): Promise<SaveResponse> {
		const path = tabPath(doc, tab);
		const current = await readText(path);
		if (sha256(current) !== req.baseHash) {
			throw new VaultError('File ini barusan berubah di luar nyoba. Muat ulang halaman dulu.', 409);
		}
		let frontmatter = req.frontmatter;
		if (req.title !== undefined) frontmatter = setMeta(frontmatter, 'title', req.title.trim());
		const content = joinFrontmatter(frontmatter, req.body, splitFrontmatter(current));
		if (content !== current) await writeAtomic(path, content, `docs/${doc}/${tab}.md`);
		const meta = readMeta(frontmatter);
		return { hash: sha256(content), frontmatter, title: meta.title ?? tab, enums: meta.enums };
	}

	async function setTabOrder(doc: string, tabs: string[], label: string): Promise<void> {
		const { path, split } = await readDocMeta(doc);
		await writeAtomic(
			path,
			joinFrontmatter(setMeta(split.frontmatter, 'tabs', tabs), split.body),
			label
		);
	}

	async function createTab(doc: string, title: string): Promise<string> {
		const info = await getDoc(doc);
		const used = info.tabs.map((t) => Number.parseInt(t.slug, 10)).filter(Number.isFinite);
		const n = String((used.length ? Math.max(...used) : 0) + 1).padStart(2, '0');
		let slug = `${n}-${slugify(title)}`;
		for (let i = 2; existsSync(tabPath(doc, slug)); i++) slug = `${n}-${slugify(title)}-${i}`;
		await writeAtomic(
			tabPath(doc, slug),
			`---\ntitle: ${JSON.stringify(title)}\n---\n\n`,
			`baru: ${doc}/${slug}`
		);
		await setTabOrder(doc, [...info.tabs.map((t) => t.slug), slug], `docs/${doc}/${DOC_FILE}`);
		return slug;
	}

	async function createDoc(title: string): Promise<{ doc: string; tab: string }> {
		let doc = slugify(title);
		for (let i = 2; existsSync(join(docsDir, doc)); i++) doc = `${slugify(title)}-${i}`;
		await mkdir(docDir(doc), { recursive: true });
		await writeAtomic(
			join(docDir(doc), DOC_FILE),
			`---\ntitle: ${JSON.stringify(title)}\ntabs: []\n---\n`,
			`baru: ${doc}`
		);
		return { doc, tab: await createTab(doc, 'Catatan') };
	}

	async function renameDoc(doc: string, title: string): Promise<void> {
		await getDoc(doc);
		const { path, split } = await readDocMeta(doc);
		const fm = setMeta(split.frontmatter, 'title', title.trim());
		await writeAtomic(path, joinFrontmatter(fm, split.body), `docs/${doc}/${DOC_FILE}`);
	}

	async function deleteTab(doc: string, tab: string): Promise<void> {
		const info = await getDoc(doc);
		if (info.tabs.length <= 1)
			throw new VaultError('Tab terakhir nggak bisa dihapus. Hapus dokumennya aja.', 400);
		await rm(tabPath(doc, tab));
		await setTabOrder(
			doc,
			info.tabs.map((t) => t.slug).filter((t) => t !== tab),
			`hapus: ${doc}/${tab}`
		);
	}

	async function deleteDoc(doc: string): Promise<void> {
		await getDoc(doc);
		await rm(docDir(doc), { recursive: true });
		onChange(`hapus: ${doc}`);
	}

	async function moveTab(doc: string, tab: string, to: number): Promise<void> {
		const slugs = (await getDoc(doc)).tabs.map((t) => t.slug).filter((t) => t !== tab);
		slugs.splice(Math.max(0, Math.min(to, slugs.length)), 0, checkSegment(tab));
		await setTabOrder(doc, slugs, `docs/${doc}/${DOC_FILE}`);
	}

	return {
		listDocs,
		getDoc,
		readTab,
		saveTab,
		createDoc,
		createTab,
		renameDoc,
		deleteTab,
		deleteDoc,
		moveTab
	};
}
