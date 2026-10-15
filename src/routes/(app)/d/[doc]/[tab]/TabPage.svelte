<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { beforeNavigate, goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { api, apiUrl } from '#lib/api.ts';
	import Editor from '#lib/editor/Editor.svelte';
	import type { DocInfo, SaveRequest, SaveResponse, TabContent } from '#lib/types.ts';

	let { content, doc, docs }: { content: TabContent; doc: DocInfo; docs: DocInfo[] } = $props();

	// Satu instance per tab ({#key} di +page.svelte), jadi nilai awal dari props cukup diambil sekali.
	const initial = untrack(() => content);
	const slug = { doc: initial.doc, tab: initial.tab };

	let title = $state(initial.title);
	let frontmatter = $state(initial.frontmatter);
	let enums = $state(initial.enums);
	let hash = initial.hash;
	let allowLossy = $state(false);
	let showProps = $state(false);
	let menuOpen = $state(false);
	let words = $state(0);
	let editor = $state<ReturnType<typeof Editor>>();
	let titleInput = $state<HTMLInputElement>();

	type Status = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';
	let status = $state<Status>('saved');
	let errorMessage = $state('');
	let version = 0;
	let savedVersion = 0;
	let saving = false;
	let titleDirty = false;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const editable = $derived(!initial.lossy || allowLossy);
	const statusText: Record<Status, string> = {
		saved: 'Tersimpan',
		dirty: 'Belum disimpan…',
		saving: 'Menyimpan…',
		error: 'Gagal nyimpen, nyoba lagi…',
		conflict: 'Konflik'
	};

	function changed(): void {
		version++;
		if (status === 'conflict') return;
		status = 'dirty';
		clearTimeout(timer);
		timer = setTimeout(save, 1000);
	}

	async function save(keepalive = false): Promise<void> {
		clearTimeout(timer);
		if (saving || version === savedVersion || status === 'conflict' || !editor) return;
		saving = true;
		status = 'saving';
		const v = version;
		const sentFrontmatter = frontmatter;
		const sentTitle = titleDirty && title.trim() ? title.trim() : undefined;
		titleDirty = false;
		const req: SaveRequest = {
			frontmatter,
			body: editor.getMarkdown(),
			baseHash: hash,
			title: sentTitle
		};
		try {
			const res = await api<SaveResponse>('PUT', apiUrl(slug.doc, slug.tab), req, { keepalive });
			hash = res.hash;
			savedVersion = v;
			if (frontmatter === sentFrontmatter) frontmatter = res.frontmatter;
			enums = res.enums;
			if (sentTitle !== undefined) void invalidate('nyoba:docs');
			status = version === savedVersion ? 'saved' : 'dirty';
		} catch (err) {
			if (sentTitle !== undefined) titleDirty = true;
			errorMessage = (err as Error).message;
			status = (err as { status?: number }).status === 409 ? 'conflict' : 'error';
			if (status === 'error') timer = setTimeout(save, 5000);
		} finally {
			saving = false;
		}
		if (status === 'dirty') void save();
	}

	/** Buang perubahan yang belum kesimpan (tab/dokumennya udah dihapus). */
	function discard(): void {
		clearTimeout(timer);
		savedVersion = version;
		status = 'saved';
	}

	function flush(): void {
		void save(true);
		navigator.sendBeacon('/api/commit');
	}

	beforeNavigate(flush);

	function onKeydown(e: KeyboardEvent): void {
		if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			void save();
		}
	}

	function onBeforeUnload(e: BeforeUnloadEvent): void {
		if (status !== 'saved') e.preventDefault();
	}

	const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
	const findDoc = (name: string) => docs.find((d) => same(d.slug, name) || same(d.title, name));
	const findTab = (d: DocInfo, name: string) =>
		d.tabs.find((t) => same(t.slug, name) || same(t.title, name));

	/** `[[tab]]`, `[[dokumen]]`, atau `[[dokumen/tab]]`; cocok ke slug atau judul. */
	async function navigate(target: string): Promise<void> {
		const slash = target.indexOf('/');
		const docName = slash < 0 ? undefined : target.slice(0, slash);
		const tabName = slash < 0 ? target : target.slice(slash + 1);
		const inDoc = docName === undefined ? doc : findDoc(docName);

		const tab = inDoc && findTab(inDoc, tabName);
		if (inDoc && tab) {
			await goto(resolve('/(app)/d/[doc]/[tab]', { doc: inDoc.slug, tab: tab.slug }));
			return;
		}
		const other = docName === undefined ? findDoc(tabName) : undefined;
		if (other) {
			await goto(resolve('/(app)/d/[doc]', { doc: other.slug }));
			return;
		}
		if (!inDoc) {
			alert(`Dokumen "${docName}" nggak ketemu.`);
			return;
		}
		if (confirm(`Tab "${tabName}" belum ada di "${inDoc.title}". Bikin sekarang?`)) {
			await addTab(tabName, inDoc.slug);
		}
	}

	async function renameDoc(e: Event): Promise<void> {
		const value = (e.currentTarget as HTMLInputElement).value.trim();
		if (!value || value === doc.title) return;
		await api('PATCH', apiUrl(slug.doc), { title: value });
		await invalidate('nyoba:docs');
	}

	async function addTab(title = 'Tab baru', inDoc = slug.doc): Promise<void> {
		flush();
		const res = await api<{ tab: string }>('POST', apiUrl(inDoc), { title });
		await invalidate('nyoba:docs');
		await goto(resolve('/(app)/d/[doc]/[tab]', { doc: inDoc, tab: res.tab }), {
			state: { baru: title === 'Tab baru' }
		});
	}

	async function deleteTab(): Promise<void> {
		menuOpen = false;
		if (!confirm(`Hapus tab "${title}"? (Masih bisa dibalikin dari riwayat Git.)`)) return;
		try {
			await api('DELETE', apiUrl(slug.doc, slug.tab));
		} catch (err) {
			alert((err as Error).message);
			return;
		}
		discard();
		const next = doc.tabs.find((t) => t.slug !== slug.tab);
		await invalidate('nyoba:docs');
		await goto(
			next ? resolve('/(app)/d/[doc]/[tab]', { doc: slug.doc, tab: next.slug }) : resolve('/(app)')
		);
	}

	async function deleteDoc(): Promise<void> {
		menuOpen = false;
		if (!confirm(`Hapus dokumen "${doc.title}" beserta semua tabnya?`)) return;
		await api('DELETE', apiUrl(slug.doc));
		discard();
		await invalidate('nyoba:docs');
		await goto(resolve('/(app)'));
	}

	let dragging = $state<string>();

	async function dropTab(index: number): Promise<void> {
		const tab = dragging;
		dragging = undefined;
		if (!tab) return;
		await api('PATCH', apiUrl(slug.doc, tab), { index });
		await invalidate('nyoba:docs');
	}

	async function copyMarkdown(): Promise<void> {
		if (editor) await navigator.clipboard.writeText(editor.getMarkdown());
	}

	onMount(() => {
		if (page.state.baru) {
			titleInput?.focus();
			titleInput?.select();
		}
		const hide = () => document.visibilityState === 'hidden' && flush();
		document.addEventListener('visibilitychange', hide);
		return () => document.removeEventListener('visibilitychange', hide);
	});
</script>

<svelte:window onkeydown={onKeydown} onbeforeunload={onBeforeUnload} onpagehide={flush} />

<header class="top">
	<input class="doc-title" value={doc.title} aria-label="Judul dokumen" onchange={renameDoc} />
	<div class="right">
		<span class="words">{words} kata</span>
		<span
			class="status {status}"
			title={status === 'error' || status === 'conflict' ? errorMessage : ''}
		>
			<span class="dot"></span>{statusText[status]}
		</span>
		<div class="more">
			<button
				type="button"
				class="icon-btn"
				aria-label="Menu"
				onclick={() => (menuOpen = !menuOpen)}>⋯</button
			>
			{#if menuOpen}
				<div class="menu right-menu">
					<button type="button" onclick={() => ((showProps = !showProps), (menuOpen = false))}>
						{showProps ? 'Sembunyikan' : 'Tampilkan'} properti
					</button>
					<button type="button" onclick={() => ((menuOpen = false), copyMarkdown())}
						>Salin markdown</button
					>
					<button type="button" class="danger" onclick={deleteTab}>Hapus tab</button>
					<button type="button" class="danger" onclick={deleteDoc}>Hapus dokumen</button>
				</div>
			{/if}
		</div>
	</div>
</header>

<nav class="tabs" aria-label="Tab">
	{#each doc.tabs as tab, i (tab.slug)}
		<a
			href={resolve('/(app)/d/[doc]/[tab]', { doc: slug.doc, tab: tab.slug })}
			class:active={tab.slug === slug.tab}
			class:drop={dragging && dragging !== tab.slug}
			draggable="true"
			ondragstart={() => (dragging = tab.slug)}
			ondragend={() => (dragging = undefined)}
			ondragover={(e) => e.preventDefault()}
			ondrop={(e) => (e.preventDefault(), dropTab(i))}>{tab.title}</a
		>
	{/each}
	<button type="button" class="icon-btn" title="Tab baru" onclick={() => addTab()}>+</button>
</nav>

<article class="page">
	{#if status === 'conflict'}
		<div class="banner danger">
			<p>{errorMessage}</p>
			<div>
				<button type="button" onclick={copyMarkdown}>Salin isi saya dulu</button>
				<button type="button" onclick={() => location.reload()}>Muat ulang</button>
			</div>
		</div>
	{/if}

	{#if !editable}
		<div class="banner">
			<p>
				File ini punya format yang belum didukung penuh editor (misal HTML, footnote, atau gaya
				markdown lain). Kalau diedit di sini, bagian itu bisa dirapikan atau berubah. Versi lamanya
				tetap aman di riwayat Git.
			</p>
			<div><button type="button" onclick={() => (allowLossy = true)}>Oke, edit aja</button></div>
		</div>
	{/if}

	<input
		bind:this={titleInput}
		class="title"
		bind:value={title}
		placeholder="Judul tab"
		aria-label="Judul tab"
		readonly={!editable}
		oninput={() => ((titleDirty = true), changed())}
		onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), editor?.focus())}
	/>

	{#if showProps}
		<label class="props">
			<span
				>Properti (YAML) — contoh dropdown: <code>enums: &#123; Status: [Draf, Revisi] &#125;</code
				></span
			>
			<textarea
				bind:value={frontmatter}
				rows={Math.min(14, frontmatter.split('\n').length + 1)}
				spellcheck="false"
				readonly={!editable}
				oninput={changed}></textarea>
		</label>
	{/if}

	<Editor
		bind:this={editor}
		body={initial.body}
		{enums}
		{editable}
		onchange={changed}
		onnavigate={(target) => void navigate(target)}
		onwords={(n) => (words = n)}
	/>
</article>

<style>
	.top {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 20px 0 24px;
		background: var(--bg);
	}
	.doc-title {
		min-width: 0;
		flex: 1;
		padding: 4px 6px;
		border: 1px solid transparent;
		border-radius: 6px;
		background: transparent;
		color: var(--muted);
		font: inherit;
		font-weight: 600;
	}
	.doc-title:hover,
	.doc-title:focus {
		border-color: var(--line);
		color: var(--text);
		outline: none;
	}
	.right {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 0.85rem;
		color: var(--muted);
		white-space: nowrap;
	}
	.status {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--accent);
	}
	.status.dirty .dot,
	.status.saving .dot {
		background: #d4a017;
	}
	.status.error,
	.status.conflict {
		color: var(--danger);
	}
	.status.error .dot,
	.status.conflict .dot {
		background: var(--danger);
	}
	.more {
		position: relative;
	}
	.right-menu {
		position: absolute;
		right: 0;
		top: calc(100% + 4px);
	}

	.tabs {
		position: sticky;
		top: 46px;
		z-index: 19;
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px 20px 0 24px;
		border-bottom: 1px solid var(--line);
		background: var(--bg);
		overflow-x: auto;
		scrollbar-width: none;
	}
	.tabs a {
		flex: none;
		padding: 7px 12px;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		color: var(--muted);
		text-decoration: none;
		font-size: 0.92rem;
		white-space: nowrap;
	}
	.tabs a:hover {
		color: var(--text);
	}
	.tabs a.active {
		color: var(--text);
		border-bottom-color: var(--accent);
		font-weight: 600;
	}
	.tabs a.drop {
		outline: 1px dashed var(--line);
		outline-offset: -4px;
		border-radius: 6px;
	}

	.page {
		max-width: 760px;
		margin: 0 auto;
		padding: 36px 24px 0;
	}
	.title {
		width: 100%;
		margin-bottom: 18px;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--text);
		font-family: var(--serif);
		font-size: 2.2rem;
		font-weight: 700;
		line-height: 1.2;
		outline: none;
	}
	.title::placeholder {
		color: var(--line);
	}
	.props {
		display: grid;
		gap: 6px;
		margin-bottom: 24px;
		font-size: 0.82rem;
		color: var(--muted);
	}
	.props code {
		font-family: var(--mono);
	}
	.props textarea {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--sidebar);
		color: var(--text);
		font-family: var(--mono);
		font-size: 0.85rem;
		line-height: 1.5;
		resize: vertical;
	}
	.banner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 20px;
		padding: 12px 14px;
		border-radius: 10px;
		background: var(--warn-bg);
		color: var(--warn-text);
		font-size: 0.9rem;
	}
	.banner p {
		margin: 0;
		flex: 1 1 320px;
	}
	.banner.danger {
		color: var(--danger);
	}
	.banner button {
		padding: 5px 10px;
		border: 1px solid currentColor;
		border-radius: 6px;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}

	@media (max-width: 800px) {
		.top {
			padding-left: 52px;
		}
		.tabs {
			padding-left: 12px;
		}
		.page {
			padding: 24px 16px 0;
		}
		.title {
			font-size: 1.7rem;
		}
		.words {
			display: none;
		}
	}
</style>
