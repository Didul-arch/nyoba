<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { api } from '#lib/api.ts';
	import { toggleTheme } from '#lib/theme.ts';
	import type { SyncStatus } from '#lib/types.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let open = $state(false);
	let creating = $state(false);
	let newTitle = $state('');
	let error = $state('');
	let sync = $state<SyncStatus>();

	onMount(() => {
		const refresh = () =>
			fetch('/api/sync')
				.then((r) => (r.ok ? r.json() : undefined))
				.then((s: SyncStatus | undefined) => (sync = s ?? sync))
				.catch(() => {});
		void refresh();
		const id = setInterval(refresh, 30_000);
		return () => clearInterval(id);
	});

	const activeDoc = $derived(page.params.doc);
	const activeTab = $derived(page.params.tab);

	async function createDoc(e: SubmitEvent) {
		e.preventDefault();
		const title = newTitle.trim();
		if (!title) return;
		try {
			const res = await api<{ doc: string; tab: string }>('POST', '/api/docs', { title });
			creating = false;
			newTitle = '';
			await invalidate('nyoba:docs');
			await goto(resolve('/(app)/d/[doc]/[tab]', { doc: res.doc, tab: res.tab }));
		} catch (err) {
			error = (err as Error).message;
		}
	}

	function focus(node: HTMLInputElement) {
		node.focus();
	}
</script>

<div class="shell">
	<button
		type="button"
		class="icon-btn burger"
		aria-label="Buka menu"
		onclick={() => (open = !open)}
	>
		☰
	</button>

	<aside class:open>
		<div class="brand">
			<a href={resolve('/(app)')} class="logo">nyoba <span aria-hidden="true">🧪</span></a>
			<button
				type="button"
				class="icon-btn close"
				aria-label="Tutup menu"
				onclick={() => (open = false)}
			>
				✕
			</button>
		</div>

		<div class="section-head">
			<span>Dokumen</span>
			<button
				type="button"
				class="icon-btn"
				aria-label="Dokumen baru"
				title="Dokumen baru"
				onclick={() => ((creating = true), (error = ''))}>+</button
			>
		</div>

		{#if creating}
			<form class="new" onsubmit={createDoc}>
				<input
					use:focus
					bind:value={newTitle}
					placeholder="Judul dokumen…"
					onkeydown={(e) => e.key === 'Escape' && (creating = false)}
					onblur={() => !newTitle && (creating = false)}
				/>
			</form>
		{/if}
		{#if error}<p class="error">{error}</p>{/if}

		<nav>
			{#each data.docs as doc (doc.slug)}
				<a
					class="doc"
					class:active={doc.slug === activeDoc}
					href={resolve('/(app)/d/[doc]', { doc: doc.slug })}
					onclick={() => (open = false)}
				>
					<span class="glyph" aria-hidden="true">{doc.slug === activeDoc ? '▾' : '▸'}</span>
					{doc.title}
				</a>
				{#if doc.slug === activeDoc}
					{#each doc.tabs as tab (tab.slug)}
						<a
							class="tab"
							class:active={tab.slug === activeTab}
							href={resolve('/(app)/d/[doc]/[tab]', { doc: doc.slug, tab: tab.slug })}
							onclick={() => (open = false)}>{tab.title}</a
						>
					{/each}
				{/if}
			{:else}
				<p class="empty">Belum ada dokumen. Klik <b>+</b> buat mulai.</p>
			{/each}
		</nav>

		{#if sync}
			<p
				class="sync"
				class:bad={!sync.ok}
				title={sync.at ? `Terakhir: ${new Date(sync.at).toLocaleString('id')}` : ''}
			>
				{sync.ok ? (sync.remote ? '☁' : '💻') : '⚠'}
				{sync.message}
			</p>
		{/if}

		<div class="foot">
			<button type="button" class="icon-btn" title="Ganti tema" onclick={toggleTheme}>◐ Tema</button
			>
			<form method="POST" action="/logout">
				<button type="submit" class="icon-btn" title="Keluar">⎋ Keluar</button>
			</form>
		</div>
	</aside>

	{#if open}
		<button type="button" class="scrim" aria-label="Tutup menu" onclick={() => (open = false)}
		></button>
	{/if}

	<main>{@render children()}</main>
</div>

<style>
	.shell {
		display: grid;
		grid-template-columns: 248px minmax(0, 1fr);
		min-height: 100dvh;
	}
	aside {
		position: sticky;
		top: 0;
		height: 100dvh;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px 10px;
		overflow-y: auto;
		background: var(--sidebar);
		border-right: 1px solid var(--line);
	}
	.brand {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2px 6px 14px;
	}
	.logo {
		font-weight: 700;
		font-size: 1.1rem;
		color: var(--text);
		text-decoration: none;
	}
	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 2px 4px 8px;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
	}
	nav {
		display: flex;
		flex-direction: column;
		gap: 1px;
		flex: 1;
	}
	nav a {
		display: block;
		padding: 5px 8px;
		border-radius: 6px;
		color: var(--text);
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	nav a:hover {
		background: var(--hover);
	}
	.glyph {
		display: inline-block;
		width: 14px;
		color: var(--muted);
		font-size: 0.75rem;
	}
	.doc.active {
		font-weight: 600;
	}
	.tab {
		padding-left: 30px;
		font-size: 0.92rem;
		color: var(--muted);
	}
	.tab.active {
		background: var(--hover);
		color: var(--text);
	}
	.new input {
		width: 100%;
		margin-bottom: 4px;
		padding: 6px 8px;
		border: 1px solid var(--accent);
		border-radius: 6px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
	}
	.empty,
	.error {
		margin: 6px 8px;
		font-size: 0.88rem;
		color: var(--muted);
	}
	.error {
		color: var(--danger);
	}
	.sync {
		margin: 0 0 8px;
		padding: 0 8px;
		font-size: 0.8rem;
		color: var(--muted);
	}
	.sync.bad {
		color: var(--danger);
	}
	.foot {
		display: flex;
		justify-content: space-between;
		padding-top: 10px;
		border-top: 1px solid var(--line);
	}
	.foot .icon-btn {
		font-size: 0.85rem;
	}
	main {
		min-width: 0;
	}
	.burger,
	.close,
	.scrim {
		display: none;
	}

	@media (max-width: 800px) {
		.shell {
			grid-template-columns: minmax(0, 1fr);
		}
		aside {
			position: fixed;
			z-index: 40;
			left: 0;
			width: 270px;
			transform: translateX(-100%);
			transition: transform 0.18s ease;
		}
		aside.open {
			transform: none;
			box-shadow: var(--shadow);
		}
		.burger {
			display: inline-grid;
			position: fixed;
			z-index: 30;
			top: 10px;
			left: 10px;
			background: var(--bg);
		}
		.close {
			display: inline-grid;
		}
		.scrim {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 35;
			border: 0;
			background: rgb(0 0 0 / 0.3);
		}
	}
</style>
