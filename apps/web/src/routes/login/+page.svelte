<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head>
	<title>log in · george</title>
</svelte:head>

<h1>Log in</h1>

<form method="POST">
	<label>
		Username
		<span class="row">
			<input type="text" name="username" value={form?.username ?? data.username} autocomplete="username" />
			<span class="muted">.{data.handleDomain}</span>
		</span>
	</label>
	{#if form?.message}
		<p class="error">{form.message}</p>
	{/if}
	<p><button>Continue with passkey</button></p>
</form>

<p class="muted">No account? <a href="/signup">Sign up</a>.</p>
