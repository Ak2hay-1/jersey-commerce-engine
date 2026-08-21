# Jersey Staff (desktop)

Windows Electron shell that embeds **POS** and **ERP** and talks to the shop’s cloud API after login. Cloud **Admin** stays in the browser on the VM (`:3001`).

## Dev

```powershell
# From repo root — builds static UIs into renderer/ then opens Electron
npm run desktop:dev
```

Default API URL comes from [`config.json`](./config.json) (`http://localhost:4000`).

## Pack for a client

```powershell
.\infra\desktop\pack-client.ps1 -ApiUrl "http://YOUR_IP:4000" -ClientName "ClientShop"
```

Or:

```powershell
# edit apps/desktop/config.json apiUrl first
npm run desktop:pack
```

Installer lands in `apps/desktop/dist/Jersey-Staff-Setup-<version>.exe`.

## Runtime

- Local UI origin: `http://127.0.0.1:39217` (`/pos/`, `/erp/`)
- `runtime-config.js` injects the baked `apiUrl`
- Top-menu **POS | ERP** switch (also on login) via `window.jceDesktop`
