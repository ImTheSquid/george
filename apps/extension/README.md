# george extension

WXT + Svelte, Manifest V3 (Chromium/Helium; Firefox via `pnpm build:firefox`).

- New tab page: your feed. Cached locally so it paints before the server answers.
- Toolbar popup: save / read-later / favorite the current page, see which friends saved it and their highlights.
- `Ctrl+Shift+S` / `⌘⇧S`: toggle save.
- Select text on any page → "highlight". Your and your friends' highlights are painted on the page. Click one of yours to remove it.
- Badge: ✓ when you saved the page, otherwise the number of friends who did.

## Install (unpacked)

```sh
pnpm --filter @george/extension build
```

Load `apps/extension/.output/chrome-mv3` via the browser's extensions page (developer mode → "Load unpacked"). Then open george → settings → "Connect extension".
