<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import InviteTable from '$lib/components/InviteTable.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>invites · george</title>
</svelte:head>

<h1>Invite codes</h1>

{#if form?.message}<p class:error={page.status >= 400}>{form.message}</p>{/if}

<form method="POST" action="?/create" use:enhance class="row">
	<label>Uses <input type="number" name="maxUses" value="1" min="1" max="1000" style="width:5rem" /></label>
	<button>New invite code</button>
</form>

<InviteTable invites={data.invites} appUrl={data.appUrl} />

<h2>Users</h2>

<table>
	<thead><tr><th>User</th><th>Used</th><th>Quota</th><th></th></tr></thead>
	<tbody>
		{#each data.users as u (u.id)}
			<tr>
				<td>
					{u.username}
					{#if u.isAdmin}<span class="muted">admin</span>{/if}
				</td>
				<td>{u.used}/{u.quota ?? 'unlimited'}</td>
				<td>
					<form method="POST" action="?/setQuota" use:enhance class="row">
						<input type="hidden" name="id" value={u.id} />
						<label>
							Quota (blank for default {data.quotaDefault})
							<input
								type="number"
								name="quota"
								min="0"
								max="1000"
								value={u.inviteQuota ?? ''}
								placeholder={String(data.quotaDefault)}
								style="width:5rem"
							/>
						</label>
						<button class="link">save</button>
					</form>
				</td>
				<td>
					<form method="POST" action="?/revokeAll" use:enhance>
						<input type="hidden" name="id" value={u.id} />
						<button class="link">revoke all codes</button>
					</form>
					{#if !u.isAdmin}
						<details>
							<summary>delete</summary>
							<form method="POST" action="?/deleteUser" use:enhance>
								<input type="hidden" name="id" value={u.id} />
								{#if u.invitees.length}
									<label>
										<input type="checkbox" name="withInvitees" />
										also delete the {u.invitees.length}
										{u.invitees.length === 1 ? 'user' : 'users'} they invited: {u.invitees.join(', ')}
									</label>
								{/if}
								<label>
									Type {u.username} to confirm
									<input type="text" name="confirm" autocomplete="off" />
								</label>
								<button class="error">delete permanently</button>
							</form>
						</details>
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
	details form {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.3rem;
	}
</style>
