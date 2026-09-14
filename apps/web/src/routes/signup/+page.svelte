<script lang="ts">
	// Runs on the PDS origin (nginx routes pds.../signup here) because the PDS's
	// WebAuthn relying party is its own hostname. The PDS API requires an email
	// string; we send a placeholder on our own domain and never show the field.
	let { data } = $props();

	let username = $state('');
	let inviteCode = $state('');
	let busy = $state(false);
	let error = $state<string | null>(null);
	let done = $state<{ handle: string } | null>(null);

	const handle = $derived(`${username.trim().toLowerCase()}.${data.handleDomain}`);
	const valid = $derived(/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(username.trim().toLowerCase()));
	const wrongOrigin = $derived(
		typeof location !== 'undefined' && !data.isLoopback && location.host !== data.pdsHost
	);

	async function xrpc<T>(method: string, body: unknown): Promise<T> {
		const res = await fetch(`${data.pdsUrl}/xrpc/${method}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) {
			const e = await res.json().catch(() => ({}));
			throw new Error(e.message ?? e.error ?? `${method} failed (${res.status})`);
		}
		return res.json();
	}

	async function signup(ev: SubmitEvent) {
		ev.preventDefault();
		if (!valid || busy) return;
		if (!window.PublicKeyCredential || !('parseCreationOptionsFromJSON' in PublicKeyCredential)) {
			error = 'This browser does not support passkeys.';
			return;
		}
		busy = true;
		error = null;
		try {
			const name = username.trim().toLowerCase();
			const created = await xrpc<{ did: string; setupToken: string }>('_account.createPasskeyAccount', {
				handle,
				email: `${name}@${data.handleDomain}`,
				inviteCode: inviteCode.trim() || undefined
			});
			const start = await xrpc<{ options: any }>('_account.startPasskeyRegistrationForSetup', {
				did: created.did,
				setupToken: created.setupToken,
				friendlyName: 'george'
			});
			const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(
				start.options.publicKey ?? start.options
			);
			const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
			if (!credential) throw new Error('Passkey creation was cancelled.');
			await xrpc('_account.completePasskeySetup', {
				did: created.did,
				setupToken: created.setupToken,
				passkeyCredential: credential.toJSON(),
				passkeyFriendlyName: 'george'
			});
			done = { handle };
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

{#if done}
	<p>Your account <strong>{done.handle}</strong> is ready.</p>
	<p><a href="{data.appUrl}/login?username={username.trim().toLowerCase()}">Log in to george</a></p>
{:else}
	{#if wrongOrigin}
		<p class="error">
			Sign-up has to happen on the account server.
			<a href="https://{data.pdsHost}/signup">Continue there</a>.
		</p>
	{/if}
	<form onsubmit={signup}>
		<label>
			Username
			<span class="row">
				<input
					type="text"
					bind:value={username}
					autocomplete="username"
					autocapitalize="off"
					spellcheck="false"
				/>
				<span class="muted">.{data.handleDomain}</span>
			</span>
		</label>
		{#if username && !valid}
			<p class="muted">2–30 letters, digits, or hyphens.</p>
		{/if}
		{#if data.inviteCodeRequired}
			<label>
				Invite code
				<input type="text" bind:value={inviteCode} autocomplete="off" />
			</label>
		{/if}
		{#if error}
			<p class="error">{error}</p>
		{/if}
		<p>
			<button disabled={busy || !valid || wrongOrigin}>
				{busy ? 'Creating…' : 'Create account with a passkey'}
			</button>
		</p>
	</form>
	<p class="muted">
		A passkey is the only way into this account — there is no password and no email recovery. Use a passkey
		that syncs (iCloud Keychain, Google Password Manager, 1Password).
	</p>
{/if}
