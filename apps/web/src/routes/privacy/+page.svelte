<svelte:head>
	<title>privacy · george</title>
</svelte:head>

<h1>Privacy</h1>

<p>
	george is a small, invite-only service for saving web pages and sharing them, with highlights and comments, among
	people who follow each other. This page describes what the george website and browser extension do with data.
</p>

<h2>What is stored</h2>
<ul>
	<li><strong>Account</strong>: your username and the public key of your passkey. No email address, no password.</li>
	<li>
		<strong>Things you save</strong>: the URL and title of pages you save, your highlights (the highlighted text and a
		little surrounding text so the highlight can be found again), your notes, comments, tags, and reading-list flags.
	</li>
	<li><strong>Social</strong>: who you follow.</li>
	<li>
		<strong>Operational</strong>: login sessions, extension tokens, and the standard web server access log (IP
		address, requested URL, time), kept only as long as the server keeps logs.
	</li>
</ul>

<h2>What the extension does</h2>
<ul>
	<li>
		When you open the extension on a page, save it with the keyboard shortcut, or create a highlight, the extension
		sends that page's URL (and title, if you save it) to your george instance so it can be saved and so friends'
		highlights for that page can be shown.
	</li>
	<li>
		To show the toolbar badge, the extension asks the instance about the page in the active tab. Pages you do not
		save or highlight are not stored; the lookup is answered and forgotten.
	</li>
	<li>
		The extension keeps two things in the browser's extension storage: the token that links it to your account, and
		the address of your instance. It keeps no browsing history and stores nothing else locally.
	</li>
	<li>The extension does not load remote code and contacts no server other than your george instance.</li>
</ul>

<h2>Who can see what</h2>
<p>
	Everything you save, highlight, or comment is visible to people who follow you on this instance, and to the
	instance operator, who has access to the database. Nothing is public to the wider internet, and nothing is sent to
	third parties. There is no advertising and no analytics.
</p>

<h2>Deleting data</h2>
<p>
	You can delete individual links, highlights, and comments at any time; deletion is immediate. To delete your
	account and everything in it, contact the operator of this instance.
</p>

<h2>Self-hosting</h2>
<p>
	george is open source (MIT). Each instance is run independently; the operator of the instance you use is
	responsible for its data. This instance is run by its owner for a small group of friends.
</p>
