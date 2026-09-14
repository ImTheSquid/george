<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header>
	<a class="brand" href="/">george</a>
	<nav>
		{#if data.user}
			<a href="/me">my links</a>
			<a href="/people">people</a>
			<span class="handle">{data.user.handle}</span>
			<form method="POST" action="/logout">
				<button class="link">log out</button>
			</form>
		{:else}
			<a href="/login">log in</a>
			<a href="/signup">sign up</a>
		{/if}
	</nav>
</header>

<main>
	{@render children()}
</main>
