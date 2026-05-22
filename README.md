# Living Garden

A meditative ecosystem game where tending a sculptural concrete head planter secretly composes
an evolving piece of generative music.

## What is included

- React + Vite frontend with a single dark gallery-style terrarium scene.
- React Three Fiber concrete cortex planter, glowing flowers, creatures, weather, and day/night mood.
- Express API with one shared garden state for the MVP.
- Garden ticks on every read; no cron process is required.
- Server-computed adaptive stem mix across ambience, pads, drones, bass, percussion, melodic,
  vocals, and FX.
- Web Audio playback gate that renders the returned stem descriptors with oscillators and smooth
  gain/filter crossfades.
- Field journal for discovered flowers, creatures, weather, and musical stems.
- OpenAPI contract in `docs/openapi.yaml`.

## Development

```bash
npm install
npm run dev
```

The Vite client runs with `/api` proxied to the Express server.

## Production build

```bash
npm run build
npm start
```
