# Jersey Staff (desktop) — **deprecated**

> **Deprecated.** Production staff work (Admin + ERP + POS) runs in the **browser** on the unified Vercel staff portal (`portal=all`, POS at `/pos`). Do not pack or ship this EXE for new go-lives.

This Electron shell remains in the monorepo for historical packs only. Prefer `https://admin.<shop>` (or the project’s staff URL) instead of Windows installers.

## Legacy pack (not for go-live)

```powershell
# From repo root — builds static UIs into renderer/ then opens Electron
npm run desktop:dev
```

Default API URL comes from [`config.json`](./config.json) (`http://localhost:4000`).

```powershell
.\infra\desktop\pack-client.ps1 -ApiUrl "http://YOUR_IP:4000" -ClientName "ClientShop"
```

Or:

```powershell
# edit apps/desktop/config.json apiUrl first
npm run desktop:pack
```

Installer lands in `apps/desktop/dist/Jersey-Staff-Setup-<version>.exe`.

## Runtime (legacy)

- Local UI origin: `http://127.0.0.1:39217` (`/pos/`, `/erp/`)
- `runtime-config.js` injects the baked `apiUrl`
- Top-menu **POS | ERP** switch (also on login) via `window.jceDesktop`
