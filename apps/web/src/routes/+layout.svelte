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
			{#if data.user.isAdmin}<a href="/admin/invites">invites</a>{/if}
			<a class="handle" href="/u/{data.user.username}">{data.user.username}</a>
			<a href="/settings">settings</a>
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

<footer class="muted">
	<a href="/privacy">privacy</a> ·
	<a href="https://chromewebstore.google.com/detail/george/iocpapkgcmoaijcjlocmppldpnagiilh" rel="noopener">
		extension
	</a> ·
	<a href="https://github.com/ImTheSquid/george" rel="noopener">source</a>
</footer>
