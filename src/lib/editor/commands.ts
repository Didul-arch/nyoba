import type { ChainedCommands } from '@tiptap/core';

export interface SlashItem {
	label: string;
	hint: string;
	icon: string;
	keywords: string;
	run: (chain: ChainedCommands) => ChainedCommands;
}

export const SLASH_ITEMS: SlashItem[] = [
	{
		label: 'Teks',
		hint: 'Paragraf biasa',
		icon: '¶',
		keywords: 'teks paragraf text',
		run: (c) => c.setParagraph()
	},
	{
		label: 'Judul 1',
		hint: '#',
		icon: 'H1',
		keywords: 'judul heading h1 bab',
		run: (c) => c.setHeading({ level: 1 })
	},
	{
		label: 'Judul 2',
		hint: '##',
		icon: 'H2',
		keywords: 'judul heading h2 subbab',
		run: (c) => c.setHeading({ level: 2 })
	},
	{
		label: 'Judul 3',
		hint: '###',
		icon: 'H3',
		keywords: 'judul heading h3',
		run: (c) => c.setHeading({ level: 3 })
	},
	{
		label: 'List',
		hint: '-',
		icon: '•',
		keywords: 'list bullet daftar',
		run: (c) => c.toggleBulletList()
	},
	{
		label: 'List bernomor',
		hint: '1.',
		icon: '1.',
		keywords: 'list nomor ordered angka',
		run: (c) => c.toggleOrderedList()
	},
	{
		label: 'Checklist',
		hint: '- [ ]',
		icon: '☑',
		keywords: 'checklist tugas todo task',
		run: (c) => c.toggleTaskList()
	},
	{
		label: 'Tabel',
		hint: '3 × 3',
		icon: '▦',
		keywords: 'tabel table tracker',
		run: (c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
	},
	{
		label: 'Kutipan',
		hint: '>',
		icon: '❝',
		keywords: 'kutipan quote blockquote',
		run: (c) => c.toggleBlockquote()
	},
	{
		label: 'Kode',
		hint: '```',
		icon: '{}',
		keywords: 'kode code',
		run: (c) => c.toggleCodeBlock()
	},
	{
		label: 'Garis',
		hint: '---',
		icon: '―',
		keywords: 'garis pemisah divider hr',
		run: (c) => c.setHorizontalRule()
	}
];

export function filterSlash(query: string): SlashItem[] {
	const q = query.toLowerCase();
	return SLASH_ITEMS.filter(
		(i) => !q || i.label.toLowerCase().includes(q) || i.keywords.includes(q)
	);
}
