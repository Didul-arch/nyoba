<script lang="ts">
	import TabPage from './TabPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.content.title} · {data.doc.title} · nyoba</title></svelte:head>

{#key `${data.content.doc}/${data.content.tab}`}
	<TabPage content={data.content} doc={data.doc} docs={data.docs} />
{/key}
