<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	// The extension's content script on this origin listens for this message.
	$effect(() => {
		if (form?.token) {
			window.postMessage({ type: 'george:connect', token: form.token, appUrl: data.appUrl }, location.origin);
		}
	});
</script>

<svelte:head>
	<title>settings · george</title>
</svelte:head>

<h1>Settings</h1>

<h2>Profile</h2>
<form method="POST" action="?/profile" use:enhance>
	<p><label>Display name <input type="text" name="displayName" value={data.profile.displayName} /></label></p>
	<p><label>About <input type="text" name="description" value={data.profile.description} /></label></p>
	<p><label>Website <input type="url" name="website" value={data.profile.website} /></label></p>
	{#if form?.message}<p class="error">{form.message}</p>{/if}
	<p><button>Save</button> {#if form?.saved}<span class="muted">saved</span>{/if}</p>
</form>

<h2>Browser extension</h2>
<p class="muted">
	With the george extension installed, this connects it to your account. Not installed yet? Get it from the
	<a href="https://chromewebstore.google.com/detail/george/iocpapkgcmoaijcjlocmppldpnagiilh" rel="noopener">
		Chrome Web Store
	</a>.
</p>
<form method="POST" action="?/connect" use:enhance>
	<button>Connect extension</button>
</form>
{#if form?.token}
	<p class="muted">
		Sent to the extension. If it didn't pick it up, paste this token into the extension's settings:
		<code>{form.token}</code>
	</p>
{/if}

{#if data.tokens.length}
	<h3>Connected devices</h3>
	{#each data.tokens as t (t.id)}
		<div class="item row">
			<span>{t.name}</span>
			<span class="muted">
				added {new Date(t.createdAt).toLocaleDateString()}
				{#if t.lastUsedAt}· last used {new Date(t.lastUsedAt).toLocaleDateString()}{/if}
			</span>
			<form method="POST" action="?/revoke" use:enhance style="margin-left:auto">
				<input type="hidden" name="id" value={t.id} />
				<button class="link">revoke</button>
			</form>
		</div>
	{/each}
{/if}
