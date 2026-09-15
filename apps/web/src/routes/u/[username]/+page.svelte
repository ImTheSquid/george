<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	function host(url: string) {
		return new URL(url).hostname.replace(/^www\./, '');
	}
</script>

<svelte:head>
	<title>{data.profile.username} · george</title>
</svelte:head>

<h1>{data.profile.displayName ?? data.profile.username}</h1>
<p class="muted">
	{data.profile.username}
	{#if data.profile.website}
		· <a href={data.profile.website} rel="noopener">{host(data.profile.website)}</a>
	{/if}
</p>
{#if data.profile.description}<p>{data.profile.description}</p>{/if}

{#if !data.isMe}
	<form method="POST" action="/people?/{data.following ? 'unfollow' : 'follow'}" use:enhance>
		<input type="hidden" name="id" value={data.profile.id} />
		<button>{data.following ? 'Unfollow' : 'Follow'}</button>
	</form>
{/if}

{#each data.links as l (l.id)}
	<article class="item">
		<a class="title" href={l.url} rel="noopener">{l.title ?? l.url}</a>
		<span class="muted">{host(l.url)}</span>
		<div class="meta">{new Date(l.createdAt).toLocaleDateString()}</div>
	</article>
{:else}
	<p class="muted">No links yet.</p>
{/each}
