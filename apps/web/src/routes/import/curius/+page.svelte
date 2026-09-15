<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let busy = $state(false);
</script>

<svelte:head>
	<title>import from Curius · george</title>
</svelte:head>

<h1>Import from Curius</h1>

<p>
	Curius's reads are public, so this needs no login there: enter your profile URL (like
	<code>curius.app/jack-hogan</code>) and your saved links, highlights, and comments are copied here. Running it
	again only adds what is new.
</p>

<form method="POST" use:enhance={() => { busy = true; return async ({ update }) => { await update(); busy = false; }; }} class="row">
	<input type="text" name="userLink" placeholder="curius.app/your-name" value={form?.userLink ?? data.curiusUserLink ?? ''} style="flex: 1 1 16rem" required />
	<button disabled={busy}>{busy ? 'Importing…' : 'Import'}</button>
</form>
{#if form?.message}
	<p class="error">{form.message}</p>
{/if}

{#if form?.result}
	{@const r = form.result}
	<h2>Imported</h2>
	<p>
		{r.links} links, {r.highlights} highlights, {r.comments} comments
		{#if r.skipped}<span class="muted">({r.skipped} unusable URLs skipped)</span>{/if}
	</p>
	{#if r.followed.length}
		<p>Now following {r.followed.length} friend{r.followed.length === 1 ? '' : 's'} who already joined: {r.followed.join(', ')}.</p>
	{/if}
	{#if r.unmatched.length}
		<h3>Friends not here yet</h3>
		<p class="muted">Send them an invite; when they import their own Curius account you'll be connected automatically.</p>
		<ul>
			{#each r.unmatched as f (f.userLink)}
				<li>{f.name} <span class="muted">({f.userLink})</span></li>
			{/each}
		</ul>
	{/if}
	<p><a href="/me">See your links</a></p>
{/if}

<p class="muted">
	Want the raw data instead? <a href="/import/curius/export.json?user={data.curiusUserLink ?? ''}">Download the JSON</a>
	(fill in your slug in the address if it's empty).
</p>
