<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
</script>

<svelte:head>
	<title>people · george</title>
</svelte:head>

<h1>People</h1>

{#each data.people as p (p.id)}
	<div class="item row">
		<a href="/u/{p.username}"><strong>{p.displayName ?? p.username}</strong></a>
		<span class="muted">{p.username}</span>
		<form method="POST" action={p.following ? '?/unfollow' : '?/follow'} use:enhance style="margin-left:auto">
			<input type="hidden" name="id" value={p.id} />
			<button class="link">{p.following ? 'unfollow' : 'follow'}</button>
		</form>
	</div>
{:else}
	<p class="muted">Nobody else here yet.</p>
{/each}
