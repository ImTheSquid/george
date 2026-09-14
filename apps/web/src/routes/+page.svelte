<script lang="ts">
	import FeedItem from '$lib/components/FeedItem.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>george</title>
</svelte:head>

{#if data.feed === null}
	<h1>george</h1>
	<p>Save pages from your browser. Your friends see what you save and highlight; you see theirs.</p>
	<p><a href="/signup">Sign up</a> with a username and a passkey, or <a href="/login">log in</a>.</p>
{:else if data.feed.length === 0}
	<p class="muted">Nothing here yet. <a href="/people">Follow some people</a> to fill your feed.</p>
{:else}
	{#each data.feed as item (item.kind === 'link' ? item.link.uri : item.highlight.uri)}
		<FeedItem {item} />
	{/each}
{/if}
