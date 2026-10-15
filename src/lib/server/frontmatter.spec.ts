import { describe, expect, it } from 'vitest';
import { joinFrontmatter, readMeta, setMeta, splitFrontmatter } from './frontmatter';

const file = `---
title: Progress
# pilihan status
enums:
  Status: [Belum mulai, Riset, Draf]
---

| Subbab | Status |
`;

describe('frontmatter', () => {
	it('pisah & gabung lagi persis sama', () => {
		const split = splitFrontmatter(file);
		expect(split.body).toBe('| Subbab | Status |\n');
		expect(joinFrontmatter(split.frontmatter, split.body, split)).toBe(file);
	});

	it('file tanpa frontmatter tetap utuh', () => {
		expect(splitFrontmatter('# Judul\n')).toEqual({ head: '', frontmatter: '', body: '# Judul\n' });
		expect(joinFrontmatter('', '# Judul\n')).toBe('# Judul\n');
	});

	it('baca judul & enums', () => {
		expect(readMeta(splitFrontmatter(file).frontmatter)).toEqual({
			title: 'Progress',
			tabs: undefined,
			enums: { Status: ['Belum mulai', 'Riset', 'Draf'] }
		});
	});

	it('YAML rusak nggak bikin crash', () => {
		expect(readMeta('title: [kebuka')).toEqual({ enums: {} });
		expect(() => setMeta('title: [kebuka', 'title', 'x')).toThrow(/rusak/);
	});

	it('ganti judul tanpa ngacak komentar & sisanya', () => {
		const fm = setMeta(splitFrontmatter(file).frontmatter, 'title', 'Progres Skripsi');
		expect(fm).toBe(
			'title: Progres Skripsi\n# pilihan status\nenums:\n  Status: [Belum mulai, Riset, Draf]'
		);
		expect(setMeta('', 'title', 'Baru')).toBe('title: Baru');
	});
});
