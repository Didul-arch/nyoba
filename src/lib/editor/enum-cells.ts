import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Enums } from '#lib/types.ts';

/** Warna chip per urutan opsi (hue HSL), biar "Draf" selalu warna yang sama. */
export const HUES = [215, 35, 275, 145, 0, 185, 325, 55];

export interface EnumPick {
	/** Posisi sel di dokumen. */
	pos: number;
	options: string[];
	value: string;
	rect: DOMRect;
}

interface PluginState {
	enums: Enums;
	deco: DecorationSet;
}

export const enumKey = new PluginKey<PluginState>('enumCells');

/** Panggil fungsi untuk tiap sel badan tabel yang kolomnya punya enum. */
function eachEnumCell(
	doc: PMNode,
	enums: Enums,
	fn: (cell: PMNode, pos: number, options: string[]) => void
): void {
	doc.descendants((node, pos) => {
		if (node.type.name !== 'table') return true;
		const headers: string[] = [];
		node.firstChild?.forEach((cell) => headers.push(cell.textContent.trim()));
		node.forEach((row, rowOffset, rowIndex) => {
			if (rowIndex === 0) return;
			row.forEach((cell, cellOffset, col) => {
				const options = enums[headers[col] ?? ''];
				if (options) fn(cell, pos + 1 + rowOffset + 1 + cellOffset, options);
			});
		});
		return false;
	});
}

function build(doc: PMNode, enums: Enums): DecorationSet {
	const decos: Decoration[] = [];
	eachEnumCell(doc, enums, (cell, pos, options) => {
		const value = cell.textContent.trim();
		const index = options.indexOf(value);
		const state = !value ? 'enum-empty' : index < 0 ? 'enum-invalid' : '';
		decos.push(
			Decoration.node(pos, pos + cell.nodeSize, {
				class: `enum-cell ${state}`.trim(),
				style: index < 0 ? '' : `--h: ${HUES[index % HUES.length]}`,
				title: index < 0 && value ? `"${value}" nggak ada di daftar pilihan` : ''
			})
		);
	});
	return DecorationSet.create(doc, decos);
}

function enumAt(state: EditorState, cellPos: number): string[] | undefined {
	const enums = enumKey.getState(state)?.enums ?? {};
	let found: string[] | undefined;
	eachEnumCell(state.doc, enums, (_cell, pos, options) => {
		if (pos === cellPos) found = options;
	});
	return found;
}

/**
 * Sel tabel di kolom yang punya `enums` di frontmatter tampil sebagai chip,
 * dan klik sel itu manggil `onPick` buat buka dropdown. Isi file tetap teks biasa.
 */
export const EnumCells = Extension.create<{ enums: Enums; onPick: (pick: EnumPick) => void }>({
	name: 'enumCells',

	addOptions() {
		return { enums: {}, onPick: () => {} };
	},

	addProseMirrorPlugins() {
		const { enums: initial, onPick } = this.options;
		return [
			new Plugin<PluginState>({
				key: enumKey,
				state: {
					init: (_, state) => ({ enums: initial, deco: build(state.doc, initial) }),
					apply(tr, prev) {
						const enums: Enums = tr.getMeta(enumKey) ?? prev.enums;
						if (!tr.docChanged && enums === prev.enums) return prev;
						return { enums, deco: build(tr.doc, enums) };
					}
				},
				props: {
					decorations: (state) => enumKey.getState(state)?.deco,
					handleClickOn(view, _pos, node, nodePos) {
						if (node.type.name !== 'tableCell' || !view.editable) return false;
						const options = enumAt(view.state, nodePos);
						const dom = view.nodeDOM(nodePos);
						if (!options || !(dom instanceof HTMLElement)) return false;
						onPick({
							pos: nodePos,
							options,
							value: node.textContent.trim(),
							rect: dom.getBoundingClientRect()
						});
						return true;
					}
				}
			})
		];
	}
});
