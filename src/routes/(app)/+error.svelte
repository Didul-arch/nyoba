<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
</script>

<div class="oops">
	<h1>{page.status === 404 ? 'Nggak ketemu 🫥' : 'Waduh, error 😵'}</h1>
	<p>{page.error?.message}</p>
	<a href={resolve('/(app)')}>← Balik ke awal</a>
</div>

<style>
	.oops {
		max-width: 520px;
		margin: 18vh auto 0;
		padding: 0 16px;
	}
	h1 {
		font-family: var(--serif);
	}
	p {
		color: var(--muted);
	}
</style>
