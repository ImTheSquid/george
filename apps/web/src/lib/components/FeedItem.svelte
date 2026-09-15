<script lang="ts">
	import type { FeedItem } from '$lib/server/queries';

	let { item }: { item: FeedItem } = $props();

	const url = $derived(item.kind === 'link' ? item.link.url : item.highlight.url);
	const host = $derived(new URL(url).hostname.replace(/^www\./, ''));
	const when = $derived(new Date(item.createdAt).toLocaleDateString());
	const name = $derived(item.user.displayName ?? item.user.username);
	const discuss = $derived(`/link?url=${encodeURIComponent(url)}`);
</script>

<article class="item">
	<div class="meta">
		<a href="/u/{item.user.username}">{name}</a>
		{item.kind === 'link' ? 'saved' : 'highlighted'} · {when} · <a href={discuss}>discuss</a>
	</div>
	{#if item.kind === 'link'}
		<a class="title" href={item.link.url} rel="noopener">{item.link.title ?? item.link.url}</a>
		<span class="muted">{host}</span>
		{#if item.link.tags.length}
			<div class="meta">{item.link.tags.join(', ')}</div>
		{/if}
	{:else}
		<a class="title" href={item.highlight.url} rel="noopener">{host}</a>
		<blockquote>{item.highlight.exact}</blockquote>
		{#if item.highlight.note}
			<p>{item.highlight.note}</p>
		{/if}
	{/if}
</article>
