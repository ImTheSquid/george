<script lang="ts">
	import { api, NotConnected, type FeedItem } from '@/utils/api';
	import { DEFAULT_APP_URL, feedCacheItem, getSettings } from '@/utils/settings';

	let appUrl = $state(DEFAULT_APP_URL);
	let connected = $state(true);
	let items = $state<FeedItem[] | null>(null);
	let error = $state<string | null>(null);

	async function load() {
		const s = await getSettings();
		appUrl = s.appUrl;
		connected = !!s.token;
		if (!connected) return;
		// Paint the last feed first; a new tab that blanks on every open feels broken.
		items = await feedCacheItem.getValue();
		try {
			const fresh = (await api.feed()).items;
			items = fresh;
			await feedCacheItem.setValue(fresh);
		} catch (e) {
			if (e instanceof NotConnected) {
				connected = false;
				items = null;
			} else {
				error = e instanceof Error ? e.message : String(e);
			}
		}
	}

	const url = (item: FeedItem) => (item.kind === 'link' ? item.link.url : item.highlight.url);
	const name = (item: FeedItem) => item.user.displayName ?? item.user.username;
	const when = (item: FeedItem) => new Date(item.createdAt).toLocaleDateString();
	const discuss = (item: FeedItem) => `${appUrl}/link?url=${encodeURIComponent(url(item))}`;

	function host(raw: string): string {
		try {
			return new URL(raw).hostname.replace(/^www\./, '');
		} catch {
			return raw;
		}
	}

	load();
</script>

<header>
	<a class="brand" href="{appUrl}/">george</a>
	<nav>
		<a href="{appUrl}/me">my links</a>
		<a href="{appUrl}/people">people</a>
	</nav>
</header>

<main>
	{#if !connected}
		<p class="muted">
			This extension isn't connected to your account, or its token was revoked.
			<a href="{appUrl}/settings">Connect it again</a>.
		</p>
	{:else if items === null}
		<!-- No cache and no response yet: stay blank rather than flashing a spinner. -->
	{:else if items.length === 0}
		<p class="muted">Nothing here yet. <a href="{appUrl}/people">Follow some people</a> to fill your feed.</p>
	{:else}
		{#each items as item (item.kind === 'link' ? item.link.id : item.highlight.id)}
			<article class="item">
				<div class="meta">
					<a href="{appUrl}/u/{item.user.username}">{name(item)}</a>
					{item.kind === 'link' ? 'saved' : 'highlighted'} · {when(item)} ·
					<a href={discuss(item)}>discuss</a>
				</div>
				{#if item.kind === 'link'}
					<a class="title" href={item.link.url} rel="noopener">{item.link.title ?? item.link.url}</a>
					<span class="muted">{host(item.link.url)}</span>
					{#if item.link.tags.length}
						<div class="meta">{item.link.tags.join(', ')}</div>
					{/if}
				{:else}
					<a class="title" href={item.highlight.url} rel="noopener">{host(item.highlight.url)}</a>
					<blockquote>{item.highlight.exact}</blockquote>
					{#if item.highlight.note}
						<p>{item.highlight.note}</p>
					{/if}
				{/if}
			</article>
		{/each}
	{/if}
	{#if error}
		<p class="error">{error}</p>
	{/if}
</main>
