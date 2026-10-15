import { readdirSync, readFileSync } from 'node:fs';
import type { JSONContent } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { citationLabel, escapeText, parseMarkdown, serializeMarkdown } from './markdown';

const dir = new URL('../../../tests/fixtures/', import.meta.url);
const fixtures = readdirSync(dir).filter((f) => f.endsWith('.md'));

describe('round-trip markdown', () => {
	it('punya 10 file contoh', () => {
		expect(fixtures).toHaveLength(10);
	});

	it.each(fixtures)('%s tetap identik setelah dibuka & disimpan', (name) => {
		const md = readFileSync(new URL(name, dir), 'utf8');
		expect(serializeMarkdown(parseMarkdown(md))).toBe(md);
	});

	it('ngedit satu paragraf cuma ngubah baris itu', () => {
		const md = readFileSync(new URL('10-tracker.md', dir), 'utf8');
		const doc = parseMarkdown(md);
		const para = doc.content?.find((n: JSONContent) => n.type === 'paragraph');
		if (!para) throw new Error('nggak ada paragraf');
		para.content = [{ type: 'text', text: 'Update setelah bimbingan ke-4.' }];

		const before = md.split('\n');
		const after = serializeMarkdown(doc).split('\n');
		const changed = before.filter((line, i) => line !== after[i]);
		expect(after).toHaveLength(before.length);
		expect(changed).toEqual(['Update terakhir setelah bimbingan ke-3.']);
	});
});

describe('escapeText', () => {
	it('biarin karakter yang nggak mungkin jadi sintaks', () => {
		expect(escapeText('snake_case ~40 [1] 50% A & B')).toBe('snake_case ~40 [1] 50% A & B');
		expect(escapeText('[ sendirian')).toBe('[ sendirian');
	});

	it('escape yang bisa kebaca sebagai format', () => {
		expect(escapeText('*bintang* _miring_ ~~coret~~ <b>')).toBe(
			'\\*bintang\\* \\_miring\\_ \\~\\~coret\\~\\~ &lt;b>'
		);
		expect(escapeText('# bukan judul')).toBe('\\# bukan judul');
		expect(escapeText('[[x]] [@a] [^1] [t](u) [ ] tugas')).toBe(
			'\\[[x]] \\[@a] \\[^1] [t\\](u) [ ] tugas'
		);
		expect(escapeText('[ ] bukan tugas')).toBe('\\[ \\] bukan tugas');
	});

	it('teks yang di-escape kebaca balik sama persis', () => {
		const text = '*a* _b_ [c](d) [[e]] [@f] ~~g~~ <h> &amp; # i';
		const doc: JSONContent = {
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
		};
		const back = parseMarkdown(serializeMarkdown(doc));
		expect(back.content?.[0].content).toEqual([{ type: 'text', text }]);
	});
});

describe('citationLabel', () => {
	it('rapiin isi sitasi buat chip', () => {
		expect(citationLabel('@muhammad2025, hlm. 39')).toBe('muhammad2025 · hlm. 39');
		expect(citationLabel('@a2024; @b2023, hlm. 2')).toBe('a2024; b2023 · hlm. 2');
	});
});
