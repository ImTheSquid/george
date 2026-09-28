<script lang="ts">
	import { enhance } from '$app/forms';
	import InviteTable from '$lib/components/InviteTable.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>invites · george</title>
</svelte:head>

<h1>Invites</h1>

<form method="POST" action="?/create" use:enhance class="row">
	<span class="muted">
		{#if data.allowance.quota === null}
			unlimited invites
		{:else}
			{data.allowance.remaining} of {data.allowance.quota} invites left
		{/if}
	</span>
	<button disabled={data.allowance.remaining === 0}>New invite code</button>
</form>
{#if form?.message}<p class="error">{form.message}</p>{/if}

<InviteTable invites={data.invites} appUrl={data.appUrl} />
