# george

Open-source Curius: save a page from your browser, friends see it in a shared feed, highlight and comment on what you read. Built on [ATproto](https://atproto.com); accounts live on a self-hosted PDS and sign up with a username and a passkey — nothing else.

Status: under construction. See `deploy/README.md` for the server side.

## Layout

- `lexicons/` — record schemas (`me.jackhogan.george.*`)
- `packages/lexicon` — generated TypeScript for the schemas (`pnpm gen`)
- `packages/shared` — URL normalization and other code shared by app and extension
- `apps/web` — SvelteKit app: feed, profiles, AppView indexer, OAuth, signup
- `apps/extension` — browser extension (WXT)
- `tools/curius` — export your data from curius.app
- `deploy/` — PDS + nginx deployment

## Notes for self-hosters

- Accounts are passkey-only. There is no email and no recovery: if a user loses their passkey, the account is gone. Use a synced passkey (iCloud Keychain, Google Password Manager, 1Password).
- Everything a user saves is public, including the reading list. That is how ATproto works.

## License

MIT. The PDS this instance runs ([Tranquil](https://tangled.org/bas.sh/tranquil-pds)) is a separate AGPL service.
