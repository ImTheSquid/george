<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
</script>

<svelte:head>
	<title>invites · george</title>
</svelte:head>

<h1>Invite codes</h1>

<form method="POST" action="?/create" use:enhance>
	<button>New invite code</button>
</form>

<table>
	<thead><tr><th>Code</th><th>Created</th><th>Used</th></tr></thead>
	<tbody>
		{#each data.invites as i (i.code)}
			<tr>
				<td><code>{i.code}</code></td>
				<td class="muted">{new Date(i.createdAt).toLocaleDateString()}</td>
				<td class="muted">{i.usedAt ? new Date(i.usedAt).toLocaleDateString() : '—'}</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	table {
		border-collapse: collapse;
		margin-top: 1rem;
	}
	th,
	td {
		text-align: left;
		padding: 0.3rem 1rem 0.3rem 0;
		border-bottom: 1px solid var(--line);
	}
</style>
