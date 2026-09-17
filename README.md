<img src="icon.svg" alt="" width="72" align="right">

# george

Open-source Curius: save a page from your browser, friends see it in a shared feed, highlight and comment on what you read. Sign up with a username and a passkey — nothing else. Invite-only by default.

Status: under construction. See `deploy/README.md` for the server side.

## Layout

- `apps/web` — SvelteKit app: passkey auth, feed, profiles, invites (SQLite via Drizzle)
- `apps/extension` — browser extension (WXT); replaces the new tab page with your feed
- `packages/shared` — URL normalization shared by app and extension
- `tools/curius` — export your data from curius.app
- `deploy/` — docker compose + nginx

## Self-hosting

The instance hostname `george.jackhogan.me` is hardcoded in a few places; change it to yours:
`apps/extension/wxt.config.ts` (host_permissions), `apps/extension/entrypoints/*.content.ts` (matches),
`apps/extension/utils/settings.ts` (`DEFAULT_APP_URL`), `deploy/docker-compose.yml` (`APP_URL`), `deploy/nginx/george.conf`.

## Notes for self-hosters

- Accounts are passkey-only. There is no password and no email: lose the passkey, lose the account. Use a synced passkey (iCloud Keychain, Google Password Manager, 1Password).
- Everything a user saves is visible to the people who follow them.

## License

MIT.
