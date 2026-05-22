# AGENTS.md

## Cursor Cloud specific instructions

### Architecture

Living Garden (FLORA) is a full-stack single-page app:
- **Frontend:** React 19 + Vite + Three.js / React Three Fiber / drei — runs on port 5173
- **Backend:** Express 5 API — runs on port 3001
- **Dev command:** `npm run dev` (uses `concurrently` to start both)

Vite proxies `/api` requests to `http://localhost:3001`.

### Running

- `npm run dev` starts both client and server. The Vite client is on `http://localhost:5173`.
- `npm run build` creates a production bundle in `dist/`.
- The server has **no database** — all state is in-memory and resets on restart.

### 3D Model

The 3D sculpture is at `public/models/sculpture.glb` (meshopt-compressed GLTF). It uses `meshoptimizer` for decoding at runtime. If you see GLTF parse errors, ensure `meshoptimizer` is installed.

### Key files

| Area | Files |
|------|-------|
| Server + catalogs | `server/index.js` |
| React entry | `src/main.jsx` → `src/App.jsx` |
| 3D scene | `src/components/GardenScene.jsx` |
| Plant card SVGs | `src/components/FlowerCards.jsx` |
| Styles | `src/styles.css` |
| API client | `src/lib/api.js` |
| Audio engine | `src/lib/useLivingGardenAudio.js` |

### Gotchas

- The server must be running for the frontend to load (it fetches `/api/garden` on mount).
- No lint or test tooling is configured yet — `npm test` is a placeholder.
- `flora.html` is the user's original standalone design file; the integrated version lives in the React components.
