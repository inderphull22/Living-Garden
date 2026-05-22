import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

const flowerCatalog = {
  white: {
    name: "White",
    chord: [261.63, 329.63, 392],
    tone: "warm",
    color: "#f6f0df",
    description: "A calm root note that steadies the whole arrangement.",
  },
  red: {
    name: "Red",
    chord: [293.66, 349.23, 440],
    tone: "ember",
    color: "#ff5c5c",
    description: "Adds a low pulse and a warmer emotional center.",
  },
  lavender: {
    name: "Lavender",
    chord: [329.63, 392, 493.88],
    tone: "haze",
    color: "#b9a5ff",
    description: "Softens the mix with suspended, drifting harmony.",
  },
  golden: {
    name: "Golden",
    chord: [392, 493.88, 587.33],
    tone: "bright",
    color: "#ffd166",
    description: "Brightens the garden with bell-like upper notes.",
  },
  moonbloom: {
    name: "Moonbloom",
    chord: [220, 277.18, 329.63, 415.3],
    tone: "nocturne",
    color: "#cae7ff",
    description: "Only fully opens after dusk, pulling vocals and shimmer forward.",
  },
};

const creatureCatalog = {
  butterfly: {
    name: "Butterfly",
    stem: "melodic",
    cost: 3,
    description: "Unlocks slow, hovering melodic fragments.",
  },
  firefly: {
    name: "Firefly",
    stem: "pads",
    cost: 4,
    description: "Unlocks glowing pads that become stronger at night.",
  },
  beetle: {
    name: "Beetle",
    stem: "percussion",
    cost: 2,
    description: "Unlocks granular percussion from soil movement.",
  },
  moth: {
    name: "Moth",
    stem: "drones",
    cost: 5,
    description: "Unlocks darker drones during fog and moonlight.",
  },
  dragonfly: {
    name: "Dragonfly",
    stem: "bass",
    cost: 6,
    description: "Unlocks a patient bass current under healthy gardens.",
  },
};

const weatherCatalog = {
  clear: { name: "Clear", brightness: 0.72, texture: "open" },
  rain: { name: "Rain", brightness: 0.52, texture: "soft-noise" },
  fog: { name: "Fog", brightness: 0.36, texture: "blurred" },
  storm: { name: "Storm", brightness: 0.22, texture: "fractured" },
  moonlight: { name: "Moonlight", brightness: 0.45, texture: "silver" },
};

const initialFlowers = Object.fromEntries(
  Object.keys(flowerCatalog).map((id) => [id, { count: 0, health: 0.76 }]),
);

const garden = {
  id: "shared-cortex",
  createdAt: new Date().toISOString(),
  lastTickAt: Date.now(),
  weatherStartedAt: Date.now(),
  weather: "clear",
  water: 0.64,
  pollution: 0.12,
  spores: 1,
  collectedSpores: 0,
  flowers: {
    ...initialFlowers,
    white: { count: 1, health: 0.82 },
  },
  creatures: Object.fromEntries(
    Object.keys(creatureCatalog).map((id) => [id, { attracted: false, visits: 0 }]),
  ),
  journal: {
    flowers: ["white"],
    creatures: [],
    stems: ["ambience"],
    weather: ["clear"],
  },
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getDayPhase(now = Date.now()) {
  const cycleMs = 20 * 60 * 1000;
  const progress = (now % cycleMs) / cycleMs;

  if (progress < 0.18) return "dawn";
  if (progress < 0.55) return "day";
  if (progress < 0.7) return "dusk";
  return "night";
}

function pickWeather(now) {
  const phase = getDayPhase(now);
  const options =
    phase === "night"
      ? ["moonlight", "fog", "clear", "rain"]
      : ["clear", "rain", "fog", "storm", "clear"];
  const index = Math.floor(now / (9 * 60 * 1000)) % options.length;
  return options[index];
}

function flowerTotal() {
  return Object.values(garden.flowers).reduce((sum, flower) => sum + flower.count, 0);
}

function livingFlowerTotal() {
  return Object.values(garden.flowers).reduce(
    (sum, flower) => sum + flower.count * flower.health,
    0,
  );
}

function advanceGarden() {
  const now = Date.now();
  const elapsedMinutes = Math.max(0, (now - garden.lastTickAt) / 60000);
  garden.lastTickAt = now;
  garden.dayPhase = getDayPhase(now);

  const nextWeather = pickWeather(now);
  if (garden.weather !== nextWeather) {
    garden.weather = nextWeather;
    garden.weatherStartedAt = now;
    if (!garden.journal.weather.includes(nextWeather)) garden.journal.weather.push(nextWeather);
  }

  if (elapsedMinutes === 0) return;

  const weatherPressure = garden.weather === "storm" ? 1.8 : garden.weather === "rain" ? 0.45 : 1;
  const planted = flowerTotal();
  garden.water = clamp(
    garden.water - elapsedMinutes * 0.012 * weatherPressure + (garden.weather === "rain" ? 0.022 : 0),
  );
  garden.pollution = clamp(
    garden.pollution + elapsedMinutes * (0.004 + planted * 0.0009) - (garden.weather === "rain" ? 0.006 : 0),
  );

  for (const [id, flower] of Object.entries(garden.flowers)) {
    if (flower.count === 0) continue;
    const idealWater = id === "moonbloom" ? 0.48 : 0.58;
    const waterScore = 1 - Math.abs(garden.water - idealWater);
    const pollutionPenalty = garden.pollution * (id === "red" ? 0.5 : 0.8);
    const nightBonus = id === "moonbloom" && garden.dayPhase === "night" ? 0.08 : 0;
    const healthDelta = (waterScore - 0.54 - pollutionPenalty + nightBonus) * 0.025 * elapsedMinutes;
    flower.health = clamp(flower.health + healthDelta, 0.08, 1);
  }

  const sporeGrowth = livingFlowerTotal() * elapsedMinutes * 0.045;
  garden.spores = Math.min(99, Number((garden.spores + sporeGrowth).toFixed(2)));
}

function addJournalEntry(type, id) {
  if (!garden.journal[type].includes(id)) garden.journal[type].push(id);
}

function handleAction(action, payload = {}) {
  advanceGarden();

  if (action === "plant") {
    const species = payload.species;
    if (!flowerCatalog[species]) {
      return { ok: false, message: "Unknown flower species." };
    }

    garden.flowers[species].count += 1;
    garden.flowers[species].health = clamp(garden.flowers[species].health + 0.12);
    garden.water = clamp(garden.water - 0.05);
    addJournalEntry("flowers", species);
    return { ok: true, message: `${flowerCatalog[species].name} flower planted.` };
  }

  if (action === "water") {
    garden.water = clamp(garden.water + 0.24);
    return { ok: true, message: "The concrete basin drinks slowly." };
  }

  if (action === "clean") {
    garden.pollution = clamp(garden.pollution - 0.22);
    return { ok: true, message: "A film of pollution lifts from the soil." };
  }

  if (action === "collect") {
    const collected = Math.floor(garden.spores);
    garden.spores = Number((garden.spores - collected).toFixed(2));
    garden.collectedSpores += collected;
    return { ok: true, message: collected ? `${collected} spores collected.` : "No mature spores yet." };
  }

  if (action === "attract") {
    const species = payload.species;
    const creature = creatureCatalog[species];
    if (!creature) return { ok: false, message: "Unknown creature species." };
    if (garden.collectedSpores < creature.cost) {
      return { ok: false, message: `${creature.name} needs ${creature.cost} collected spores.` };
    }

    garden.collectedSpores -= creature.cost;
    garden.creatures[species].attracted = true;
    garden.creatures[species].visits += 1;
    addJournalEntry("creatures", species);
    addJournalEntry("stems", creature.stem);
    return { ok: true, message: `${creature.name} joined the living score.` };
  }

  return { ok: false, message: "Unknown garden action." };
}

function computeMood() {
  const health = flowerTotal() ? livingFlowerTotal() / flowerTotal() : 0.35;
  const weatherBrightness = weatherCatalog[garden.weather].brightness;
  const nightDepth = garden.dayPhase === "night" ? -0.12 : garden.dayPhase === "dawn" ? 0.08 : 0;
  const brightness = clamp(health * 0.58 + weatherBrightness * 0.32 - garden.pollution * 0.24 + nightDepth);
  const density = clamp(flowerTotal() / 10 + garden.journal.creatures.length / 7);

  return {
    health: Number(health.toFixed(2)),
    brightness: Number(brightness.toFixed(2)),
    density: Number(density.toFixed(2)),
    tension: Number(clamp(garden.pollution + (garden.weather === "storm" ? 0.32 : 0)).toFixed(2)),
  };
}

function primaryChord() {
  const planted = Object.entries(garden.flowers)
    .filter(([, flower]) => flower.count > 0)
    .sort((a, b) => b[1].count * b[1].health - a[1].count * a[1].health);

  if (!planted.length) return flowerCatalog.white.chord;
  return flowerCatalog[planted[0][0]].chord;
}

function stemGain(stem, mood) {
  const isNight = garden.dayPhase === "night" || garden.dayPhase === "dusk";
  const base = {
    ambience: 0.35,
    pads: 0.24,
    drones: 0.2,
    bass: 0.18,
    percussion: 0.16,
    melodic: 0.2,
    vocals: 0.12,
    fx: 0.12,
  }[stem];

  const dayMod =
    stem === "pads" && isNight
      ? 0.1
      : stem === "drones" && garden.weather === "fog"
        ? 0.12
        : stem === "percussion" && garden.weather === "rain"
          ? -0.07
          : stem === "vocals" && isNight
            ? 0.1
            : 0;

  return Number(clamp(base + mood.density * 0.22 + mood.brightness * 0.12 - mood.tension * 0.16 + dayMod, 0, 0.72).toFixed(3));
}

function computeMusic() {
  const chord = primaryChord();
  const mood = computeMood();
  const unlockedStems = new Set(["ambience", "fx", ...garden.journal.stems]);
  const hasMoonbloom = garden.flowers.moonbloom.count > 0;
  if (hasMoonbloom) unlockedStems.add("vocals");

  const allStems = [
    {
      id: "ambience",
      label: "Concrete Air",
      type: "drone",
      frequencies: [55, 82.41],
      wave: "sine",
      movement: 0.04,
    },
    {
      id: "pads",
      label: "Firefly Pad",
      type: "pad",
      frequencies: chord.map((note) => note / 2),
      wave: "sine",
      movement: 0.07,
    },
    {
      id: "drones",
      label: "Moth Drone",
      type: "drone",
      frequencies: [chord[0] / 4, chord[1] / 4],
      wave: "triangle",
      movement: 0.025,
    },
    {
      id: "bass",
      label: "Dragonfly Bass",
      type: "bass",
      frequencies: [chord[0] / 4],
      wave: "sine",
      movement: 0.12,
    },
    {
      id: "percussion",
      label: "Beetle Soil",
      type: "pulse",
      frequencies: [96, 144],
      wave: "square",
      movement: 0.38,
    },
    {
      id: "melodic",
      label: "Butterfly Figure",
      type: "arp",
      frequencies: chord,
      wave: "triangle",
      movement: 0.2,
    },
    {
      id: "vocals",
      label: "Moonbloom Voice",
      type: "voice",
      frequencies: [chord[1], chord[2] ?? chord[0] * 2],
      wave: "sine",
      movement: 0.055,
    },
    {
      id: "fx",
      label: `${weatherCatalog[garden.weather].name} Particles`,
      type: "noise",
      frequencies: [1800 + mood.tension * 900],
      wave: "sawtooth",
      movement: 0.16,
    },
  ];

  const stems = allStems.map((stem) => ({
    ...stem,
    active: unlockedStems.has(stem.id),
    gain: unlockedStems.has(stem.id) ? stemGain(stem.id, mood) : 0,
    filterHz: Math.round(450 + mood.brightness * 2400 - mood.tension * 350),
    pan: Number((((stem.id.charCodeAt(0) % 9) - 4) / 10).toFixed(2)),
  }));

  return {
    tempo: Math.round(46 + mood.density * 18 + mood.tension * 10),
    key: chord.map((note) => Number(note.toFixed(2))),
    dayPhase: garden.dayPhase,
    weather: garden.weather,
    mood,
    stems,
  };
}

function serializeGarden() {
  advanceGarden();

  return {
    garden: {
      id: garden.id,
      createdAt: garden.createdAt,
      lastTickAt: new Date(garden.lastTickAt).toISOString(),
      weather: garden.weather,
      weatherName: weatherCatalog[garden.weather].name,
      dayPhase: garden.dayPhase,
      water: Number(garden.water.toFixed(2)),
      pollution: Number(garden.pollution.toFixed(2)),
      spores: Number(garden.spores.toFixed(2)),
      collectedSpores: garden.collectedSpores,
      flowerTotal: flowerTotal(),
      livingFlowerTotal: Number(livingFlowerTotal().toFixed(2)),
      flowers: garden.flowers,
      creatures: garden.creatures,
      journal: garden.journal,
    },
    catalog: {
      flowers: flowerCatalog,
      creatures: creatureCatalog,
      weather: weatherCatalog,
    },
    music: computeMusic(),
  };
}

app.get("/api/garden", (_req, res) => {
  res.json(serializeGarden());
});

app.post("/api/garden/actions", (req, res) => {
  const result = handleAction(req.body?.action, req.body ?? {});
  const status = result.ok ? 200 : 400;
  res.status(status).json({ ...result, ...serializeGarden() });
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "..", "dist");
app.use(express.static(clientDist));
app.get("*", (_req, res, next) => {
  if (process.env.NODE_ENV !== "production") return next();
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(port, () => {
  console.log(`Living Garden API listening on ${port}`);
});
