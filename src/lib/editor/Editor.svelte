<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Editor } from '@tiptap/core';
	import { CharacterCount, Placeholder } from '@tiptap/extensions';
	import { NodeSelection } from '@tiptap/pm/state';
	import type { Enums } from '#lib/types.ts';
	import { filterSlash, type SlashItem } from './commands';
	import { EnumCells, enumKey, HUES, type EnumPick } from './enum-cells';
	import { parseMarkdown, schemaExtensions, serializeMarkdown } from './markdown';

	interface Props {
		body: string;
		enums: Enums;
		editable: boolean;
		onchange: () => void;
		onnavigate: (target: string) => void;
		onwords: (words: number) => void;
	}

	let { body, enums, editable, onchange, onnavigate, onwords }: Props = $props();

	let element: HTMLDivElement;
	let editor = $state.raw<Editor>();

	let slash = $state<{ query: string; from: number; to: number; x: number; y: number }>();
	let slashIndex = $state(0);
	const slashItems = $derived(slash ? filterSlash(slash.query) : []);

	let bubble = $state<{ x: number; y: number }>();
	let active = $state({ bold: false, italic: false, strike: false, code: false, link: false });
	let inTable = $state(false);
	let enumPick = $state<EnumPick>();
	let enumMenu = $state<HTMLDivElement>();

	export function getMarkdown(): string {
		return editor ? serializeMarkdown(editor.getJSON()) : body;
	}

	export function focus(): void {
		// view.focus() sinkron, biar ketikan cepat setelah Enter di judul nggak nyasar.
		editor?.view.focus();
		editor?.commands.focus('start');
	}

	// untrack: dispatch transaksi manggil refresh() yang baca state lain; jangan sampai jadi dependency.
	$effect(() => {
		const ed = editor;
		const value = editable;
		untrack(() => ed?.setEditable(value));
	});

	$effect(() => {
		const ed = editor;
		const value = enums;
		untrack(() => ed?.view.dispatch(ed.state.tr.setMeta(enumKey, value)));
	});

	function words(ed: Editor): number {
		return (
			ed.storage as unknown as { characterCount: { words: () => number } }
		).characterCount.words();
	}

	function refresh(): void {
		const ed = editor;
		if (!ed || ed.isDestroyed) return;
		updateSlash(ed);
		const { selection } = ed.state;
		inTable = ed.isActive('table');
		active = {
			bold: ed.isActive('bold'),
			italic: ed.isActive('italic'),
			strike: ed.isActive('strike'),
			code: ed.isActive('code'),
			link: ed.isActive('link')
		};
		const textSelected =
			!selection.empty &&
			!(selection instanceof NodeSelection) &&
			!('$anchorCell' in selection) &&
			!ed.isActive('codeBlock') &&
			ed.isFocused;
		if (!textSelected) {
			bubble = undefined;
			return;
		}
		const start = ed.view.coordsAtPos(selection.from);
		const end = ed.view.coordsAtPos(selection.to);
		const x = start.top === end.top ? (start.left + end.right) / 2 : start.left + 60;
		bubble = { x: Math.max(120, Math.min(x, window.innerWidth - 120)), y: start.top };
	}

	function updateSlash(ed: Editor): void {
		const { selection } = ed.state;
		const head = selection.$from;
		if (!selection.empty || head.parent.type.name !== 'paragraph') {
			slash = undefined;
			return;
		}
		const text = head.parent.textBetween(0, head.parentOffset, undefined, '￼');
		const m = /(?:^|\s)\/([\p{L}\d]*)$/u.exec(text);
		if (!m || !filterSlash(m[1]).length) {
			slash = undefined;
			return;
		}
		if (slash?.query !== m[1]) slashIndex = 0;
		const coords = ed.view.coordsAtPos(head.pos);
		slash = {
			query: m[1],
			from: head.pos - m[1].length - 1,
			to: head.pos,
			x: coords.left,
			y: coords.bottom + 6
		};
	}

	function runSlash(item: SlashItem): void {
		if (!editor || !slash) return;
		const { from, to } = slash;
		slash = undefined;
		item.run(editor.chain().focus().deleteRange({ from, to })).run();
	}

	function onSlashKey(event: KeyboardEvent): boolean {
		if (!slash || !slashItems.length) return false;
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			const step = event.key === 'ArrowDown' ? 1 : -1;
			slashIndex = (slashIndex + step + slashItems.length) % slashItems.length;
			return true;
		}
		if (event.key === 'Enter' || event.key === 'Tab') {
			runSlash(slashItems[slashIndex]);
			return true;
		}
		if (event.key === 'Escape') {
			slash = undefined;
			return true;
		}
		return false;
	}

	function setLink(): void {
		if (!editor) return;
		const current = editor.getAttributes('link').href as string | undefined;
		const href = prompt('Alamat tautan (kosongin buat hapus):', current ?? 'https://');
		if (href === null) return;
		const chain = editor.chain().focus().extendMarkRange('link');
		(href.trim() ? chain.setLink({ href: href.trim() }) : chain.unsetLink()).run();
	}

	function pickEnum(value: string): void {
		if (!editor || !enumPick) return;
		const { pos } = enumPick;
		enumPick = undefined;
		editor
			.chain()
			.focus()
			.command(({ tr, state }) => {
				const cell = tr.doc.nodeAt(pos);
				if (!cell) return false;
				const text = value ? state.schema.text(value) : undefined;
				tr.replaceWith(
					pos + 1,
					pos + cell.nodeSize - 1,
					state.schema.nodes.paragraph.create(null, text)
				);
				return true;
			})
			.run();
	}

	function closeEnumOnOutside(event: PointerEvent): void {
		if (enumPick && !enumMenu?.contains(event.target as Node)) enumPick = undefined;
	}

	onMount(() => {
		const ed = new Editor({
			element,
			extensions: [
				...schemaExtensions(),
				Placeholder.configure({
					placeholder: ({ node }) =>
						node.type.name === 'heading' ? 'Judul' : 'Ketik / buat menu, atau langsung nulis…'
				}),
				CharacterCount,
				EnumCells.configure({ enums: untrack(() => enums), onPick: (p) => (enumPick = p) })
			],
			content: parseMarkdown(untrack(() => body)),
			editable: untrack(() => editable),
			editorProps: {
				attributes: { class: 'prose', 'aria-label': 'Isi tab' },
				handleKeyDown: (_view, event) => onSlashKey(event),
				handleClickOn: (_view, _pos, node) => {
					if (node.type.name !== 'wikilink') return false;
					onnavigate(node.attrs.target as string);
					return true;
				},
				handleClick: (_view, _pos, event) => {
					const link = (event.target as HTMLElement).closest('a[href]');
					if (!link || !(event.metaKey || event.ctrlKey)) return false;
					window.open((link as HTMLAnchorElement).href, '_blank', 'noopener');
					return true;
				}
			},
			onUpdate: ({ editor: e, transaction }) => {
				// Transaksi akar tanpa perubahan = cuma normalisasi plugin (paragraf penutup, rapihin tabel).
				if (!transaction.docChanged) return;
				onchange();
				onwords(words(e));
			},
			onTransaction: refresh,
			onFocus: refresh,
			onBlur: () => setTimeout(refresh, 120)
		});
		editor = ed;
		onwords(words(ed));
		return () => ed.destroy();
	});
</script>

<svelte:window onscroll={refresh} onresize={refresh} onpointerdown={closeEnumOnOutside} />

<div bind:this={element} class="editor"></div>

{#if slash && slashItems.length}
	<div class="menu slash" style:left="{slash.x}px" style:top="{slash.y}px" role="listbox">
		{#each slashItems as item, i (item.label)}
			<button
				type="button"
				class:active={i === slashIndex}
				onmousedown={(e) => e.preventDefault()}
				onclick={() => runSlash(item)}
			>
				<span class="ico">{item.icon}</span>
				<span class="lbl">{item.label}</span>
				<span class="hint">{item.hint}</span>
			</button>
		{/each}
	</div>
{/if}

{#if bubble && editor}
	{@const ed = editor}
	<div class="bubble" style:left="{bubble.x}px" style:top="{bubble.y}px" role="toolbar">
		<button
			type="button"
			class:on={active.bold}
			title="Tebal (Ctrl+B)"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => ed.chain().focus().toggleBold().run()}><b>B</b></button
		>
		<button
			type="button"
			class:on={active.italic}
			title="Miring (Ctrl+I)"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => ed.chain().focus().toggleItalic().run()}><i>I</i></button
		>
		<button
			type="button"
			class:on={active.strike}
			title="Coret"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => ed.chain().focus().toggleStrike().run()}><s>S</s></button
		>
		<button
			type="button"
			class:on={active.code}
			title="Kode"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => ed.chain().focus().toggleCode().run()}><code>‹›</code></button
		>
		<button
			type="button"
			class:on={active.link}
			title="Tautan"
			onmousedown={(e) => e.preventDefault()}
			onclick={setLink}>🔗</button
		>
		<span class="sep"></span>
		<button
			type="button"
			title="Judul 2"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => ed.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button
		>
		<button
			type="button"
			title="Judul 3"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => ed.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button
		>
	</div>
{/if}

{#if inTable && editor && editable}
	{@const ed = editor}
	<div class="table-bar" role="toolbar" aria-label="Tabel">
		<span class="tlabel">Tabel</span>
		<button
			type="button"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => ed.chain().focus().addRowAfter().run()}>+ Baris</button
		>
		<button
			type="button"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => ed.chain().focus().addColumnAfter().run()}>+ Kolom</button
		>
		<button
			type="button"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => ed.chain().focus().deleteRow().run()}>− Baris</button
		>
		<button
			type="button"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => ed.chain().focus().deleteColumn().run()}>− Kolom</button
		>
		<button
			type="button"
			class="danger"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => ed.chain().focus().deleteTable().run()}>Hapus</button
		>
	</div>
{/if}

{#if enumPick}
	<div
		bind:this={enumMenu}
		class="menu enum"
		style:left="{enumPick.rect.left}px"
		style:top="{enumPick.rect.bottom + 4}px"
		role="listbox"
	>
		{#each enumPick.options as option, i (option)}
			<button
				type="button"
				class:active={option === enumPick.value}
				onclick={() => pickEnum(option)}
			>
				<span class="chip" style:--h={HUES[i % HUES.length]}>{option}</span>
			</button>
		{/each}
		<button type="button" class="clear" onclick={() => pickEnum('')}>Kosongkan</button>
	</div>
{/if}

<style>
	.editor {
		min-height: 50vh;
	}

	.slash .ico {
		display: inline-grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border: 1px solid var(--line);
		border-radius: 6px;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--muted);
	}
	.slash .lbl {
		flex: 1;
	}
	.slash .hint {
		font-family: var(--mono);
		font-size: 0.75rem;
		color: var(--muted);
	}

	.bubble {
		position: fixed;
		z-index: 50;
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 3px;
		transform: translate(-50%, calc(-100% - 8px));
		border: 1px solid var(--line);
		border-radius: 9px;
		background: var(--surface);
		box-shadow: var(--shadow);
	}
	.bubble button,
	.table-bar button {
		min-width: 30px;
		height: 28px;
		padding: 0 8px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		cursor: pointer;
	}
	.bubble button:hover,
	.table-bar button:hover {
		background: var(--hover);
	}
	.bubble button.on {
		background: var(--accent-soft);
		color: var(--accent);
	}
	.sep {
		width: 1px;
		height: 18px;
		margin: 0 3px;
		background: var(--line);
	}

	.table-bar {
		position: fixed;
		z-index: 45;
		left: 50%;
		bottom: 18px;
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 4px 6px;
		transform: translateX(-50%);
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--surface);
		box-shadow: var(--shadow);
		font-size: 0.88rem;
		white-space: nowrap;
		max-width: calc(100vw - 32px);
		overflow-x: auto;
	}
	.tlabel {
		padding: 0 8px 0 4px;
		color: var(--muted);
		font-weight: 600;
	}
	.table-bar .danger {
		color: var(--danger);
	}

	.enum .clear {
		color: var(--muted);
		font-size: 0.88rem;
	}

	/* ===== Isi dokumen ===== */
	.editor :global(.prose) {
		outline: none;
		font-family: var(--serif);
		font-size: 1.12rem;
		line-height: 1.75;
		padding-bottom: 30vh;
	}
	.editor :global(.prose > * + *) {
		margin-top: 0.75em;
	}
	.editor :global(.prose p) {
		margin: 0;
	}
	.editor :global(.prose p + p) {
		margin-top: 0.75em;
	}
	.editor :global(.prose h1),
	.editor :global(.prose h2),
	.editor :global(.prose h3),
	.editor :global(.prose h4) {
		font-family: var(--sans);
		line-height: 1.3;
		letter-spacing: -0.01em;
		margin: 1.6em 0 0.4em;
	}
	.editor :global(.prose h1) {
		font-size: 1.75rem;
	}
	.editor :global(.prose h2) {
		font-size: 1.4rem;
	}
	.editor :global(.prose h3) {
		font-size: 1.15rem;
	}
	.editor :global(.prose > :first-child) {
		margin-top: 0;
	}
	.editor :global(.prose a) {
		color: var(--accent);
		text-underline-offset: 3px;
	}
	.editor :global(.prose code) {
		font-family: var(--mono);
		font-size: 0.85em;
		padding: 0.1em 0.35em;
		border-radius: 4px;
		background: var(--hover);
	}
	.editor :global(.prose pre) {
		padding: 12px 14px;
		border-radius: 8px;
		background: var(--hover);
		overflow-x: auto;
		line-height: 1.5;
	}
	.editor :global(.prose pre code) {
		padding: 0;
		background: none;
	}
	.editor :global(.prose blockquote) {
		margin-left: 0;
		padding-left: 16px;
		border-left: 3px solid var(--line);
		color: var(--muted);
	}
	.editor :global(.prose hr) {
		border: 0;
		border-top: 1px solid var(--line);
		margin: 2em 0;
	}
	.editor :global(.prose ul),
	.editor :global(.prose ol) {
		padding-left: 1.4em;
	}
	.editor :global(.prose li > p) {
		margin: 0.15em 0;
	}
	.editor :global(.prose ul[data-type='taskList']) {
		list-style: none;
		padding-left: 0.2em;
	}
	.editor :global(.prose ul[data-type='taskList'] li) {
		display: flex;
		gap: 0.55em;
		align-items: flex-start;
	}
	.editor :global(.prose ul[data-type='taskList'] li > label) {
		flex: none;
		margin-top: 0.3em;
		user-select: none;
	}
	.editor :global(.prose ul[data-type='taskList'] li > label input) {
		width: 1em;
		height: 1em;
		accent-color: var(--accent);
		cursor: pointer;
	}
	.editor :global(.prose ul[data-type='taskList'] li > div) {
		flex: 1;
	}
	.editor :global(.prose li[data-checked='true'] > div) {
		color: var(--muted);
		text-decoration: line-through;
		text-decoration-color: var(--line);
	}

	.editor :global(.prose .tableWrapper) {
		overflow-x: auto;
		margin: 1em 0;
	}
	.editor :global(.prose table) {
		border-collapse: collapse;
		width: 100%;
		font-family: var(--sans);
		font-size: 0.92rem;
		line-height: 1.5;
	}
	.editor :global(.prose th),
	.editor :global(.prose td) {
		position: relative;
		min-width: 80px;
		padding: 6px 10px;
		border: 1px solid var(--line);
		text-align: left;
		vertical-align: top;
	}
	.editor :global(.prose th) {
		background: var(--sidebar);
		font-weight: 600;
	}
	.editor :global(.prose .selectedCell::after) {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--accent-soft);
		opacity: 0.6;
		pointer-events: none;
	}
	.editor :global(td.enum-cell) {
		cursor: pointer;
	}
	.editor :global(td.enum-cell > p) {
		display: inline-block;
		padding: 0 9px;
		border-radius: 999px;
		font-size: 0.88em;
		background: hsl(var(--h, 30) var(--chip-s) var(--chip-l-bg));
		color: hsl(var(--h, 30) 45% var(--chip-l-text));
	}
	.editor :global(td.enum-empty > p) {
		background: transparent;
		color: var(--muted);
	}
	.editor :global(td.enum-empty > p::before) {
		content: 'Pilih…';
		opacity: 0.6;
	}
	.editor :global(td.enum-invalid > p) {
		background: var(--hover);
		color: var(--muted);
		outline: 1px dashed var(--muted);
	}
	.editor :global(td.enum-invalid > p::after) {
		content: ' ⚠';
	}

	.editor :global(.wikilink) {
		color: var(--accent);
		cursor: pointer;
		border-bottom: 1px dashed currentColor;
	}
	.editor :global(.wikilink::before) {
		content: '↗ ';
		font-size: 0.8em;
	}
	.editor :global(.citation) {
		display: inline-block;
		padding: 0 7px;
		border-radius: 999px;
		font-family: var(--sans);
		font-size: 0.78em;
		line-height: 1.7;
		vertical-align: 0.08em;
		background: var(--accent-soft);
		color: var(--accent);
	}
	.editor :global(.ProseMirror-selectednode) {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
		border-radius: 4px;
	}
	.editor :global(.prose .is-empty::before) {
		content: attr(data-placeholder);
		float: left;
		height: 0;
		color: var(--muted);
		opacity: 0.7;
		pointer-events: none;
	}
</style>
