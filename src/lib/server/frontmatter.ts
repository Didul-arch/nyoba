import { Document, isCollection, parse, parseDocument } from 'yaml';
import type { Enums } from '#lib/types.ts';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n?---[ \t]*(?:\r?\n|$)(?:[ \t]*\r?\n)*/;

export interface Split {
	/** Bagian kepala file apa adanya (garis `---`, YAML, baris kosong sesudahnya). */
	head: string;
	frontmatter: string;
	body: string;
}

export function splitFrontmatter(src: string): Split {
	const m = FRONTMATTER.exec(src);
	if (!m) return { head: '', frontmatter: '', body: src };
	return { head: m[0], frontmatter: m[1], body: src.slice(m[0].length) };
}

/** Gabung lagi. Kalau YAML-nya nggak berubah, kepala lama dipakai persis biar diff bersih. */
export function joinFrontmatter(frontmatter: string, body: string, previous?: Split): string {
	if (previous && previous.frontmatter === frontmatter) return previous.head + body;
	const fm = frontmatter.trim();
	if (!fm) return body;
	return body ? `---\n${fm}\n---\n\n${body}` : `---\n${fm}\n---\n`;
}

export interface Meta {
	title?: string;
	tabs?: string[];
	enums: Enums;
}

const strings = (v: unknown): string[] =>
	Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined).map(String) : [];

/** YAML rusak nggak bikin crash; anggap aja nggak ada metadata. */
export function readMeta(frontmatter: string): Meta {
	let data: unknown;
	try {
		data = parse(frontmatter);
	} catch {
		return { enums: {} };
	}
	if (!data || typeof data !== 'object' || Array.isArray(data)) return { enums: {} };
	const obj = data as Record<string, unknown>;

	const enums: Enums = {};
	if (obj.enums && typeof obj.enums === 'object' && !Array.isArray(obj.enums)) {
		for (const [col, opts] of Object.entries(obj.enums)) {
			const list = strings(opts);
			if (list.length) enums[col] = list;
		}
	}
	return {
		title:
			typeof obj.title === 'string' || typeof obj.title === 'number'
				? String(obj.title)
				: undefined,
		tabs: obj.tabs === undefined ? undefined : strings(obj.tabs),
		enums
	};
}

/** Ubah satu kunci di YAML tanpa ngacak-ngacak sisanya (komentar & urutan tetap). */
export function setMeta(frontmatter: string, key: string, value: unknown): string {
	const doc = frontmatter.trim() ? parseDocument(frontmatter) : new Document({});
	if (doc.errors.length)
		throw new Error('Frontmatter YAML-nya rusak, benerin dulu di panel Properti');
	// Pertahankan gaya list yang udah ada; list baru pakai gaya `[a, b]` kayak di spek.
	const node = doc.createNode(value);
	const prev = doc.get(key, true);
	if (isCollection(node)) node.flow = isCollection(prev) ? Boolean(prev.flow) : true;
	doc.set(key, node);
	return doc.toString({ flowCollectionPadding: false }).trimEnd();
}
