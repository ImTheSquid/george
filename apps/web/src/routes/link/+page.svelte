<script lang="ts">
	import { enhance } from '$app/forms';
	import Thread from '$lib/components/Thread.svelte';

	let { data, form } = $props();

	const action = $derived(`/link?url=${encodeURIComponent(data.url)}`);
	const host = $derived(new URL(data.url).hostname.replace(/^www\./, ''));
	const savers = $derived([
		...(data.network.mine ? ['you'] : []),
		...data.network.friends.map((f) => f.user.displayName ?? f.user.username)
	]);
</script>

<svelte:head>
	<title>{data.title ?? host} · george</title>
</svelte:head>

<h1><a href={data.url} rel="noopener">{data.title ?? data.url}</a></h1>
<div class="muted">
	{host}
	{#if savers.length}· saved by {savers.join(', ')}{/if}
	{#if !data.network.mine}
		<form method="POST" action="{action}&/save" use:enhance style="display:inline">
			<input type="hidden" name="title" value={data.title ?? ''} />
			· <button class="link">save it too</button>
		</form>
	{/if}
</div>
{#if form?.message}<p class="error">{form.message}</p>{/if}

<h2>Highlights</h2>
{#each data.network.highlights as h (h.highlight.id)}
	<div class="item">
		<div class="meta">
			<a href="/u/{h.user.username}">{h.mine ? 'you' : h.user.displayName ?? h.user.username}</a>
			· {new Date(h.highlight.createdAt).toLocaleDateString()}
		</div>
		<blockquote>{h.highlight.exact}</blockquote>
		{#if h.highlight.note}<p>{h.highlight.note}</p>{/if}
		<Thread comments={data.network.comments} subjectType="highlight" subjectId={h.highlight.id} {action} />
		<form method="POST" action="{action}&/comment" use:enhance class="row">
			<input type="hidden" name="subjectType" value="highlight" />
			<input type="hidden" name="subjectId" value={h.highlight.id} />
			<input type="text" name="text" placeholder="Comment on this highlight…" required style="flex:1 1 12rem" />
			<button>Comment</button>
		</form>
	</div>
{:else}
	<p class="muted">No highlights yet. Select text on the page with the extension to add one.</p>
{/each}

<h2>Discussion</h2>
{#each [...(data.network.mine ? [{ link: data.network.mine, mine: true }] : []), ...data.network.friends.map((f) => ({ link: f.link, mine: false }))] as l (l.link.id)}
	<Thread comments={data.network.comments} subjectType="link" subjectId={l.link.id} {action} />
{/each}
{#if data.network.mine}
	<form method="POST" action="{action}&/comment" use:enhance class="row">
		<input type="hidden" name="subjectType" value="link" />
		<input type="hidden" name="subjectId" value={data.network.mine.id} />
		<input type="text" name="text" placeholder="Say something about this page…" required style="flex:1 1 16rem" />
		<button>Comment</button>
	</form>
{:else if data.network.friends[0]}
	<form method="POST" action="{action}&/comment" use:enhance class="row">
		<input type="hidden" name="subjectType" value="link" />
		<input type="hidden" name="subjectId" value={data.network.friends[0].link.id} />
		<input type="text" name="text" placeholder="Reply to {data.network.friends[0].user.displayName ?? data.network.friends[0].user.username}…" required style="flex:1 1 16rem" />
		<button>Comment</button>
	</form>
{/if}
