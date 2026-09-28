<script lang="ts">
	import { enhance } from '$app/forms';
	import type { listInvites } from '$lib/server/invites';

	type Props = {
		invites: ReturnType<typeof listInvites>;
		appUrl: string;
	};
	let { invites, appUrl }: Props = $props();

	function signupLink(code: string) {
		return `${appUrl}/signup?invite=${code}`;
	}
</script>

<table>
	<thead><tr><th>Code</th><th>Uses</th><th>Status</th><th>Created</th><th></th></tr></thead>
	<tbody>
		{#each invites as i (i.code)}
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
