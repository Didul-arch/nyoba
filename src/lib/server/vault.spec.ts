import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createVault, sha256, slugify, VaultError } from './vault';

describe('slugify', () => {
	it('bikin nama file aman', () => {
		expect(slugify('Bab 1: Pendahuluan')).toBe('bab-1-pendahuluan');
		expect(slugify('Café & Résumé')).toBe('cafe-resume');
		expect(slugify('???')).toBe('tanpa-judul');
	});
});

describe('vault', () => {
	let root: string;
	let changes: string[];
	let vault: ReturnType<typeof createVault>;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), 'nyoba-'));
		changes = [];
		vault = createVault(root, (label) => changes.push(label));
	});

	it('bikin dokumen + tab pertama, lalu muncul di daftar', async () => {
		const { doc, tab } = await vault.createDoc('Tracker Skripsi');
		expect({ doc, tab }).toEqual({ doc: 'tracker-skripsi', tab: '01-catatan' });
		expect(await vault.listDocs()).toEqual([
			{
				slug: 'tracker-skripsi',
				title: 'Tracker Skripsi',
				tabs: [{ slug: '01-catatan', title: 'Catatan' }]
			}
		]);
		expect(readFileSync(join(root, 'docs/tracker-skripsi/_doc.md'), 'utf8')).toBe(
			'---\ntitle: "Tracker Skripsi"\ntabs: [01-catatan]\n---\n'
		);
	});

	it('buka → ubah → simpan: file identik kecuali yang diubah', async () => {
		const { doc } = await vault.createDoc('Kolokium');
		const path = join(root, 'docs/kolokium/01-bab-1.md');
		const original = '---\ntitle: Bab 1\n---\n\n# Pendahuluan\n\nParagraf satu.\n\nParagraf dua.\n';
		writeFileSync(path, original);

		const tab = await vault.readTab(doc, '01-bab-1');
		expect(tab.lossy).toBe(false);
		await vault.saveTab(doc, '01-bab-1', {
			frontmatter: tab.frontmatter,
			body: tab.body.replace('Paragraf dua.', 'Paragraf dua, direvisi.'),
			baseHash: tab.hash
		});
		expect(readFileSync(path, 'utf8')).toBe(
			original.replace('Paragraf dua.', 'Paragraf dua, direvisi.')
		);
		expect(changes).toContain('docs/kolokium/01-bab-1.md');
	});

	it('nolak simpan kalau file berubah dari luar (409)', async () => {
		const { doc, tab } = await vault.createDoc('A');
		const content = await vault.readTab(doc, tab);
		writeFileSync(join(root, 'docs/a', `${tab}.md`), 'diubah di Obsidian\n');
		await expect(
			vault.saveTab(doc, tab, { frontmatter: '', body: 'x\n', baseHash: content.hash })
		).rejects.toMatchObject({ status: 409 });
	});

	it('ganti judul tab lewat simpan', async () => {
		const { doc, tab } = await vault.createDoc('A');
		const c = await vault.readTab(doc, tab);
		const res = await vault.saveTab(doc, tab, { ...c, baseHash: c.hash, title: 'Log Kerja' });
		expect(res.title).toBe('Log Kerja');
		expect(res.hash).toBe(sha256(readFileSync(join(root, 'docs/a', `${tab}.md`), 'utf8')));
		expect((await vault.getDoc(doc)).tabs[0].title).toBe('Log Kerja');
	});

	it('tab baru, pindah urutan, hapus', async () => {
		const { doc } = await vault.createDoc('A');
		const t2 = await vault.createTab(doc, 'Log Kerja');
		const t3 = await vault.createTab(doc, 'Referensi');
		expect([t2, t3]).toEqual(['02-log-kerja', '03-referensi']);

		await vault.moveTab(doc, t3, 0);
		expect((await vault.getDoc(doc)).tabs.map((t) => t.slug)).toEqual([t3, '01-catatan', t2]);

		await vault.deleteTab(doc, '01-catatan');
		expect((await vault.getDoc(doc)).tabs.map((t) => t.slug)).toEqual([t3, t2]);
	});

	it('tab terakhir nggak bisa dihapus', async () => {
		const { doc, tab } = await vault.createDoc('A');
		await expect(vault.deleteTab(doc, tab)).rejects.toBeInstanceOf(VaultError);
	});

	it('nolak path aneh', async () => {
		await expect(vault.readTab('..', 'x')).rejects.toMatchObject({ status: 400 });
		await expect(vault.readTab('a', '../../etc/passwd')).rejects.toMatchObject({ status: 400 });
		await expect(vault.readTab('a', '_doc')).rejects.toMatchObject({ status: 400 });
	});

	it('nandain file yang formatnya bakal berubah kalau disimpan', async () => {
		const { doc } = await vault.createDoc('A');
		writeFileSync(join(root, 'docs/a/02-html.md'), 'Teks <div>html</div>\n\n* bintang\n');
		expect((await vault.readTab(doc, '02-html')).lossy).toBe(true);
	});
});
