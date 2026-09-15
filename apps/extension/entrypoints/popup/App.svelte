<script lang="ts">
	import { browser } from '#imports';
	import { api, NotConnected, type PageInfo } from '@/utils/api';
	import { getSettings, isWebUrl, setConnection, DEFAULT_APP_URL } from '@/utils/settings';
	import type { GetPageResponse, Message } from '@/utils/messages';

	let appUrl = $state(DEFAULT_APP_URL);
	let connected = $state(false);
	let tab = $state<Browser.tabs.Tab | null>(null);
	let info = $state<PageInfo | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let busy = $state(false);
	let manualToken = $state('');

	const pageUrl = $derived(tab?.url && isWebUrl(tab.url) ? tab.url : null);

	async function load() {
		error = null;
		const s = await getSettings();
		appUrl = s.appUrl;
		connected = !!s.token;
		tab = (await browser.tabs.query({ active: true, currentWindow: true }))[0] ?? null;
		if (!connected || !pageUrl) {
			loading = false;
			return;
		}
		// Render from the background's cache first, then reconcile with the server.
		if (tab?.id) {
			const cached = (await browser.runtime
				.sendMessage({ type: 'george:get-page', tabId: tab.id } satisfies Message)
				.catch(() => null)) as GetPageResponse | null;
			if (cached?.info && cached.info.url === pageUrl) {
				info = cached.info;
				loading = false;
			}
		}
		try {
			let fresh = await api.page(pageUrl);
			// Opening the popup saves the page (Curius behaviour); the buttons then undo or refine.
			if (!fresh.mine && !fresh.unsupported) {
				await api.save({ url: pageUrl, title: tab?.title });
				fresh = await api.page(pageUrl);
				notifyPage();
			}
			info = fresh;
		} catch (e) {
			if (e instanceof NotConnected) connected = false;
			else error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	function notifyPage() {
		if (!tab?.id) return;
		browser.runtime.sendMessage({ type: 'george:page-changed' } satisfies Message).catch(() => {});
		browser.tabs.sendMessage(tab.id, { type: 'george:refresh' } satisfies Message).catch(() => {});
	}

	async function act(fn: () => Promise<unknown>) {
		if (busy) return;
		busy = true;
		error = null;
		try {
			await fn();
			info = await api.page(pageUrl!);
			notifyPage();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	const save = (toRead = false) => act(() => api.save({ url: pageUrl!, title: tab?.title, toRead }));
	// Unsave clears `info.mine` locally so the popup doesn't immediately re-save on the next load().
	const unsave = () => act(() => api.unsave(pageUrl!));
	const toggleFavorite = () => act(() => api.save({ url: pageUrl!, favorite: !info?.mine?.favorite }));
	const toggleRead = () => act(() => api.save({ url: pageUrl!, toRead: !info?.mine?.toRead }));

	function openSettings() {
		browser.tabs.create({ url: `${appUrl}/settings` });
	}

	async function connectManually() {
		if (!manualToken.trim()) return;
		await setConnection(manualToken.trim(), appUrl);
		manualToken = '';
		await load();
	}

	load();
</script>

<main>
	{#if !connected}
		<h1>george</h1>
		<p>Connect the extension to your account.</p>
		<p><button class="primary" onclick={openSettings}>Open george settings</button></p>
		<p class="muted">Or paste a token from the settings page:</p>
		<div class="row">
			<input type="text" bind:value={manualToken} placeholder="grg_…" />
			<button onclick={connectManually}>Connect</button>
		</div>
		<p class="muted">Instance: <input type="text" bind:value={appUrl} onchange={() => setConnection('', appUrl)} /></p>
	{:else if !pageUrl}
		<p class="muted">Open a web page to save it.</p>
	{:else}
		<div class="title" title={tab?.title}>{tab?.title ?? pageUrl}</div>
		<div class="muted">{new URL(pageUrl).hostname.replace(/^www\./, '')}</div>

		{#if loading && !info}
			<div class="row muted">Saving…</div>
		{:else if info?.mine}
			<div class="row">
				<button onclick={unsave} disabled={busy}>Unsave</button>
				<button onclick={toggleRead} disabled={busy}>{info.mine.toRead ? 'Mark read' : 'Read later'}</button>
				<button onclick={toggleFavorite} disabled={busy}>{info.mine.favorite ? '★' : '☆'}</button>
			</div>
		{:else if info?.unsupported}
			<div class="row muted">This page can't be saved.</div>
		{:else}
			<div class="row">
				<button class="primary" onclick={() => save(false)} disabled={busy}>Save</button>
				<button onclick={() => save(true)} disabled={busy}>Read later</button>
			</div>
		{/if}
		{#if error}<p class="error">{error}</p>{/if}

		{#if info}
			<section>
				{#if info.friends.length}
					<div>Saved by {info.friends.map((f) => f.user.displayName ?? f.user.username).join(', ')}</div>
				{:else}
					<div class="muted">None of your friends saved this yet.</div>
				{/if}
			</section>
			{#if info.highlights.length}
				<section>
					{#each info.highlights as h (h.highlight.id)}
						<div>
							<span class="muted">{h.mine ? 'you' : h.user.displayName ?? h.user.username}</span>
							<blockquote>{h.highlight.exact}</blockquote>
							{#if h.highlight.note}<div>{h.highlight.note}</div>{/if}
						</div>
					{/each}
				</section>
			{/if}
		{/if}
		<section class="muted">
			<a href="{appUrl}/" target="_blank" rel="noopener">feed</a> ·
			<a href="{appUrl}/me" target="_blank" rel="noopener">my links</a> ·
			select text on the page to highlight it
		</section>
	{/if}
</main>
