<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	function signupLink(code: string) {
		return `${data.appUrl}/signup?invite=${code}`;
	}
</script>

<svelte:head>
	<title>invites · george</title>
</svelte:head>

<h1>Invite codes</h1>

<form method="POST" action="?/create" use:enhance class="row">
	<label>Uses <input type="number" name="maxUses" value="1" min="1" max="1000" style="width:5rem" /></label>
	<button>New invite code</button>
</form>
{#if form?.message}<p class="error">{form.message}</p>{/if}

<table>
	<thead><tr><th>Code</th><th>Uses</th><th>Status</th><th>Created</th><th></th></tr></thead>
	<tbody>
		{#each data.invites as i (i.code)}
			<tr class:dim={i.status !== 'active'}>
				<td>
					<code>{i.code}</code>
					{#if i.status === 'active'}
						<button class="link muted" onclick={() => navigator.clipboard.writeText(signupLink(i.code))}>copy link</button>
					{/if}
				</td>
				<td>
					{i.uses}/{i.maxUses}
					{#if i.usedBy.length}<span class="muted">({i.usedBy.join(', ')})</span>{/if}
				</td>
				<td>{i.status}</td>
				<td class="muted">{new Date(i.createdAt).toLocaleDateString()}</td>
				<td>
					{#if i.status === 'active'}
						<form method="POST" action="?/revoke" use:enhance>
							<input type="hidden" name="code" value={i.code} />
							<button class="link">revoke</button>
						</form>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	table {
		border-collapse: collapse;
		margin-top: 1rem;
		width: 100%;
	}
	th,
	td {
		text-align: left;
		padding: 0.3rem 1rem 0.3rem 0;
		border-bottom: 1px solid var(--line);
		vertical-align: top;
	}
	.dim {
		color: var(--muted);
	}
	button.link.muted {
		margin-left: 0.5rem;
		font-size: 0.85em;
	}
</style>
