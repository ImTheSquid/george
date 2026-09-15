<script lang="ts">
	import { goto } from '$app/navigation';
	import { loginWithPasskey } from '$lib/auth-client';

	let busy = $state(false);
	let error = $state<string | null>(null);

	async function login() {
		busy = true;
		error = null;
		try {
			await loginWithPasskey();
			await goto('/', { invalidateAll: true });
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>log in · george</title>
</svelte:head>

<h1>Log in</h1>

<p><button onclick={login} disabled={busy}>{busy ? 'Waiting for passkey…' : 'Log in with passkey'}</button></p>
{#if error}
	<p class="error">{error}</p>
{/if}

<p class="muted">No account? <a href="/signup">Sign up</a>.</p>
