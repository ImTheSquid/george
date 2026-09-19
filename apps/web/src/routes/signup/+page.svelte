<script lang="ts">
	import { goto } from '$app/navigation';
	import { USERNAME_RE, USERNAME_RULE } from '@george/shared';
	import { signupWithPasskey } from '$lib/auth-client';

	let { data } = $props();

	let username = $state('');
	// svelte-ignore state_referenced_locally
	let inviteCode = $state(data.inviteCode);
	let busy = $state(false);
	let error = $state<string | null>(null);

	const normalized = $derived(username.trim().toLowerCase());
	const valid = $derived(USERNAME_RE.test(normalized));

	async function signup(ev: SubmitEvent) {
		ev.preventDefault();
		if (!valid || busy) return;
		busy = true;
		error = null;
		try {
			await signupWithPasskey(normalized, inviteCode.trim());
			await goto('/', { invalidateAll: true });
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>sign up · george</title>
</svelte:head>

<h1>Sign up</h1>

<form onsubmit={signup}>
	<label>
		Username
		<input type="text" bind:value={username} autocomplete="username" autocapitalize="off" spellcheck="false" />
	</label>
	{#if username && !valid}
		<p class="muted">{USERNAME_RULE}</p>
	{/if}
	{#if data.inviteRequired}
		<label>
			Invite code
			<input type="text" bind:value={inviteCode} autocomplete="off" />
		</label>
	{/if}
	{#if error}
		<p class="error">{error}</p>
	{/if}
	<p>
		<button disabled={busy || !valid}>{busy ? 'Creating…' : 'Create account with a passkey'}</button>
	</p>
</form>

<p class="muted">
	A passkey is the only way into this account — no password, no email. Use one that syncs (iCloud Keychain,
	Google Password Manager, 1Password).
</p>
