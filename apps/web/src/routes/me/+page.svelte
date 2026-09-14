<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	function host(url: string) {
		return new URL(url).hostname.replace(/^www\./, '');
	}
</script>

<svelte:head>
	<title>my links · george</title>
</svelte:head>

<h1>{data.toRead ? 'Reading queue' : 'My links'}</h1>

<p class="row">
	<a href="/me" aria-current={!data.toRead ? 'page' : undefined}>saved</a>
	<a href="/me?view=queue" aria-current={data.toRead ? 'page' : undefined}>queue</a>
</p>

<form method="POST" action="?/save" use:enhance class="row">
	<input type="url" name="url" placeholder="https://…" required style="flex: 1 1 20rem" />
	<input type="text" name="title" placeholder="title (optional)" />
	<label><input type="checkbox" name="toRead" /> read later</label>
	<button>Save</button>
</form>
{#if form?.message}
	<p class="error">{form.message}</p>
{/if}

{#each data.links as l (l.uri)}
	<article class="item">
		<a class="title" href={l.url} rel="noopener">{l.title ?? l.url}</a>
		<span class="muted">{host(l.url)}</span>
		<div class="meta row">
			<span>{new Date(l.createdAt).toLocaleDateString()}</span>
			{#if l.tags.length}<span>{l.tags.join(', ')}</span>{/if}
			<form method="POST" action="?/toggleRead" use:enhance>
				<input type="hidden" name="url" value={l.url} />
				<input type="hidden" name="toRead" value={String(!l.toRead)} />
				<button class="link">{l.toRead ? 'mark read' : 'read later'}</button>
			</form>
			<form method="POST" action="?/toggleFavorite" use:enhance>
				<input type="hidden" name="url" value={l.url} />
				<input type="hidden" name="favorite" value={String(!l.favorite)} />
				<button class="link">{l.favorite ? '★ unfavorite' : '☆ favorite'}</button>
			</form>
			<form method="POST" action="?/delete" use:enhance>
				<input type="hidden" name="uri" value={l.uri} />
				<button class="link">delete</button>
			</form>
		</div>
	</article>
{:else}
	<p class="muted">Nothing saved yet.</p>
{/each}
