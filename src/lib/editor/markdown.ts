import {
	Node,
	mergeAttributes,
	type Editor,
	InputRule,
	type AnyExtension,
	type JSONContent
} from '@tiptap/core';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { MarkdownManager } from '@tiptap/markdown';
import type { Node as PMNode } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';

// Escape bawaan @tiptap/markdown nge-backslash semua `[ ] _ * ~` dan ngubah `& < >` jadi entitas.
// Hasilnya file kotor (`Escape\_ini`, `\[catatan\]`, `&amp;`) dan diff Git berisik.
// Versi ini cuma escape kalau karakternya beneran bisa kebaca sebagai sintaks.
export function escapeText(text: string): string {
	const taskLike = /^\[[ xX]\]/.test(text);
	const escapeTilde = (text.match(/~/g)?.length ?? 0) >= 2;

	let out = '';
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		const prev = text[i - 1] ?? '';
		const next = text[i + 1] ?? '';
		const wordChar = /[\p{L}\p{N}]/u;
		let escape = false;
		if (ch === '\\' || ch === '`' || ch === '*') escape = true;
		else if (ch === '_') escape = !(wordChar.test(prev) && wordChar.test(next));
		else if (ch === '[') escape = /^(\[|-?@|\^)/.test(text.slice(i + 1)) || (i === 0 && taskLike);
		else if (ch === ']') escape = /[([:]/.test(next) || (i === 2 && taskLike);
		else if (ch === '~') escape = escapeTilde;
		else if (ch === '<') escape = /[A-Za-z/!?]/.test(next);
		else if (ch === '&') escape = /^&(#\d+|#x[\da-f]+|\w+);/i.test(text.slice(i));
		out += escape ? (ch === '<' ? '&lt;' : ch === '&' ? '&amp;' : '\\' + ch) : ch;
	}
	// Awal baris yang bisa jadi judul/list/kutipan.
	return out.replace(/^(#{1,6} |[-+] |\d+[.)] |> )/, '\\$1');
}

type TextEncoder = (text: string, node: JSONContent, parent?: JSONContent) => string;
const proto = MarkdownManager.prototype as unknown as {
	encodeTextForMarkdown: TextEncoder;
	codeTypes: Set<string>;
};
proto.encodeTextForMarkdown = function (
	this: typeof proto,
	text: string,
	node: JSONContent,
	parent?: JSONContent
) {
	const inCode =
		(parent?.type !== undefined && this.codeTypes.has(parent.type)) ||
		(node.marks ?? []).some((m) => this.codeTypes.has(m.type));
	return inCode ? text : escapeText(text);
};

/** Ganti seluruh teks yang cocok (termasuk kurungnya) jadi satu node chip. */
function replaceWithNode(find: RegExp, create: (match: RegExpMatchArray) => PMNode): InputRule {
	return new InputRule({
		find,
		handler: ({ state, range, match }) => {
			state.tr.replaceWith(range.from, range.to, create(match));
		}
	});
}

/** Backspace tepat setelah chip: balikin jadi teks mentah (minus `]` terakhir) biar bisa diedit. */
function unwrapBefore(
	editor: Editor,
	name: string,
	toText: (attrs: Record<string, string>) => string
): boolean {
	const { selection } = editor.state;
	const before = selection.$from.nodeBefore;
	if (!selection.empty || before?.type.name !== name) return false;
	const from = selection.from - before.nodeSize;
	return editor.chain().insertContentAt({ from, to: selection.from }, toText(before.attrs)).run();
}

/** `[[target]]` atau `[[target|label]]`. */
export const Wikilink = Node.create({
	name: 'wikilink',
	group: 'inline',
	inline: true,
	atom: true,
	selectable: true,

	addAttributes() {
		return { target: { default: '' }, label: { default: null } };
	},

	parseHTML() {
		return [{ tag: 'span[data-wikilink]' }];
	},

	renderHTML({ node, HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(HTMLAttributes, {
				'data-wikilink': node.attrs.target,
				class: 'wikilink',
				role: 'link'
			}),
			node.attrs.label ?? node.attrs.target
		];
	},

	addInputRules() {
		return [
			replaceWithNode(/\[\[([^[\]|\n]+)(?:\|([^[\]\n]+))?\]\]$/, (m) =>
				this.type.create({ target: m[1].trim(), label: m[2]?.trim() ?? null })
			)
		];
	},

	addKeyboardShortcuts() {
		return {
			Backspace: () =>
				unwrapBefore(this.editor, this.name, (a) => `[[${a.target}${a.label ? '|' + a.label : ''}]`)
		};
	},

	markdownTokenizer: {
		name: 'wikilink',
		level: 'inline',
		start: (src) => src.indexOf('[['),
		tokenize(src) {
			const m = /^\[\[([^[\]|\n]+)(?:\|([^[\]\n]+))?\]\]/.exec(src);
			if (!m) return undefined;
			return { type: 'wikilink', raw: m[0], target: m[1].trim(), label: m[2]?.trim() ?? null };
		}
	},

	parseMarkdown(token, h) {
		return h.createNode('wikilink', { target: token.target, label: token.label });
	},

	renderMarkdown(node) {
		const { target, label } = node.attrs as { target: string; label: string | null };
		return label ? `[[${target}|${label}]]` : `[[${target}]]`;
	}
});

/** Sitasi Pandoc, misal `[@owasp2021]` atau `[@muhammad2025, hlm. 39]`. Isi aslinya disimpan utuh. */
export const Citation = Node.create({
	name: 'citation',
	group: 'inline',
	inline: true,
	atom: true,
	selectable: true,

	addAttributes() {
		return { raw: { default: '' } };
	},

	parseHTML() {
		return [{ tag: 'span[data-citation]' }];
	},

	addInputRules() {
		return [
			replaceWithNode(/(?<!\[)\[(-?@[\w:.#$%&+?<>~/-]+[^[\]\n]*)\]$/, (m) =>
				this.type.create({ raw: m[1] })
			)
		];
	},

	addKeyboardShortcuts() {
		return { Backspace: () => unwrapBefore(this.editor, this.name, (a) => `[${a.raw}`) };
	},

	renderHTML({ node, HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(HTMLAttributes, { 'data-citation': node.attrs.raw, class: 'citation' }),
			citationLabel(node.attrs.raw)
		];
	},

	markdownTokenizer: {
		name: 'citation',
		level: 'inline',
		start: (src) => src.search(/\[-?@/),
		tokenize(src) {
			const m = /^\[(-?@[\w:.#$%&+?<>~/-]+[^[\]\n]*)\](?![([])/.exec(src);
			if (!m) return undefined;
			return { type: 'citation', raw: m[0], inner: m[1] };
		}
	},

	parseMarkdown(token, h) {
		return h.createNode('citation', { raw: token.inner });
	},

	renderMarkdown(node) {
		return `[${(node.attrs as { raw: string }).raw}]`;
	}
});

/** `@muhammad2025, hlm. 39` → `muhammad2025 · hlm. 39` */
export function citationLabel(raw: string): string {
	return raw
		.split(';')
		.map((part) => part.trim().replace(/^-?@/, '').replace(/,\s*/, ' · '))
		.join('; ');
}

// Tabel bawaan di-pad biar rata; satu sel berubah = semua baris berubah di diff.
// Versi ini rapat: `| a | b |`.
const CompactTableKit = TableKit.extend({
	addExtensions() {
		return (this.parent?.() ?? []).map((ext) =>
			ext.name === 'table'
				? ext.extend({
						renderMarkdown(node, h, ctx) {
							return compactTable(this.parent?.(node, h, ctx) ?? '');
						}
					})
				: ext
		);
	}
});

export function compactTable(md: string): string {
	return md
		.trim()
		.split('\n')
		.map((line, i) => {
			const cells = line
				.trim()
				.replace(/^\||\|$/g, '')
				.split(/(?<!\\)\|/)
				.map((c) => c.trim());
			const out = i === 1 ? cells.map((c) => c.replace(/-+/, '---')) : cells;
			return `| ${out.join(' | ')} |`;
		})
		.join('\n');
}

/** Ekstensi yang nentuin skema dokumen. Dipakai editor dan tes round-trip. */
export function schemaExtensions(): AnyExtension[] {
	return [
		StarterKit.configure({ underline: false, link: { openOnClick: false, autolink: true } }),
		TaskList,
		TaskItem.configure({ nested: true }),
		CompactTableKit.configure({ table: { resizable: false } }),
		Wikilink,
		Citation
	];
}

let manager: MarkdownManager | undefined;

function getManager(): MarkdownManager {
	manager ??= new MarkdownManager({ extensions: schemaExtensions() });
	return manager;
}

export function parseMarkdown(body: string): JSONContent {
	return getManager().parse(body);
}

export function serializeMarkdown(doc: JSONContent): string {
	const out = getManager().serialize(doc).trim();
	return out ? out + '\n' : '';
}
