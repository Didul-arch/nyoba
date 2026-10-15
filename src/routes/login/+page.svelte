<script lang="ts">
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Masuk · nyoba</title></svelte:head>

<main class="wrap">
	<form method="POST" class="card">
		<h1>nyoba <span aria-hidden="true">🧪</span></h1>
		<p class="tagline">Skripsi itu berat. Editornya jangan.</p>

		<label>
			<span>Username</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				name="username"
				autocomplete="username"
				required
				autofocus
				value={form?.username ?? ''}
			/>
		</label>
		<label>
			<span>Password</span>
			<input name="password" type="password" autocomplete="current-password" required />
		</label>

		{#if form?.message}
			<p class="error" role="alert">{form.message}</p>
		{/if}

		<button type="submit">Masuk</button>
	</form>
</main>

<style>
	.wrap {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 16px;
	}
	.card {
		width: min(100%, 360px);
		display: grid;
		gap: 14px;
		padding: 28px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface);
	}
	h1 {
		margin: 0;
		font-size: 1.6rem;
	}
	.tagline {
		margin: -8px 0 6px;
		color: var(--muted);
	}
	label {
		display: grid;
		gap: 6px;
		font-size: 0.9rem;
		color: var(--muted);
	}
	input {
		font: inherit;
		color: var(--text);
		padding: 9px 11px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--bg);
	}
	input:focus {
		outline: 2px solid var(--accent);
		outline-offset: -1px;
	}
	.error {
		margin: 0;
		color: var(--danger);
		font-size: 0.9rem;
	}
	button {
		font: inherit;
		font-weight: 600;
		padding: 10px;
		border: 0;
		border-radius: 8px;
		background: var(--accent);
		color: var(--on-accent);
		cursor: pointer;
	}
</style>
