import { useEffect, useMemo, useState } from "react";
import { GardenScene } from "./components/GardenScene.jsx";
import { fetchGarden, sendGardenAction } from "./lib/api.js";
import { useLivingGardenAudio } from "./lib/useLivingGardenAudio.js";

const refreshMs = 15000;

function PercentBar({ label, value, tone }) {
  return (
    <div className="meter">
      <div className="meter__label">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="meter__track">
        <div className={`meter__fill meter__fill--${tone}`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

function ActionPanel({ data, onAction, busy }) {
  const flowers = Object.entries(data.catalog.flowers);
  const creatures = Object.entries(data.catalog.creatures);

  return (
    <section className="panel action-panel" aria-labelledby="actions-heading">
      <div className="section-kicker">Tend</div>
      <h2 id="actions-heading">Grow the score</h2>
      <div className="button-grid">
        {flowers.map(([id, flower]) => (
          <button key={id} disabled={busy} onClick={() => onAction("plant", { species: id })}>
            <span className="swatch" style={{ "--swatch": flower.color }} />
            Plant {flower.name}
          </button>
        ))}
      </div>
      <div className="care-row">
        <button disabled={busy} onClick={() => onAction("water")}>Water</button>
        <button disabled={busy} onClick={() => onAction("clean")}>Clean pollution</button>
        <button disabled={busy} onClick={() => onAction("collect")}>Collect spores</button>
      </div>
      <div className="creature-list">
        {creatures.map(([id, creature]) => {
          const attracted = data.garden.creatures[id].attracted;
          return (
            <button
              key={id}
              disabled={busy || attracted}
              onClick={() => onAction("attract", { species: id })}
              className={attracted ? "is-discovered" : ""}
            >
              <span>{attracted ? "Discovered" : `${creature.cost} spores`}</span>
              Attract {creature.name}
              <small>{creature.stem} stem</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StemMixer({ music }) {
  return (
    <section className="panel" aria-labelledby="mixer-heading">
      <div className="section-kicker">Server-computed mix</div>
      <h2 id="mixer-heading">The garden is the song</h2>
      <div className="mix-meta">
        <span>{music.tempo} BPM</span>
        <span>{music.dayPhase}</span>
        <span>{music.weather}</span>
      </div>
      <div className="stem-list">
        {music.stems.map((stem) => (
          <div key={stem.id} className={`stem ${stem.gain > 0 ? "is-active" : ""}`}>
            <div>
              <strong>{stem.label}</strong>
              <span>{stem.type}</span>
            </div>
            <div className="stem__gain">
              <i style={{ width: `${Math.min(stem.gain / 0.72, 1) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FieldJournal({ data }) {
  const flowerNames = data.garden.journal.flowers.map((id) => data.catalog.flowers[id].name);
  const creatureNames = data.garden.journal.creatures.map((id) => data.catalog.creatures[id].name);

  return (
    <section className="panel journal" aria-labelledby="journal-heading">
      <div className="section-kicker">Field journal</div>
      <h2 id="journal-heading">Discovered life and sound</h2>
      <dl>
        <div>
          <dt>Flowers</dt>
          <dd>{flowerNames.length ? flowerNames.join(", ") : "None"}</dd>
        </div>
        <div>
          <dt>Creatures</dt>
          <dd>{creatureNames.length ? creatureNames.join(", ") : "None"}</dd>
        </div>
        <div>
          <dt>Stems</dt>
          <dd>{data.garden.journal.stems.join(", ")}</dd>
        </div>
        <div>
          <dt>Weather</dt>
          <dd>{data.garden.journal.weather.join(", ")}</dd>
        </div>
      </dl>
    </section>
  );
}

function AudioGate({ onEnter }) {
  return (
    <div className="audio-gate">
      <div className="gate-card">
        <div className="section-kicker">Living Garden</div>
        <h1>A terrarium that composes itself</h1>
        <p>
          Open the concrete cortex to unlock audio. Every flower and creature will become a stem in the
          evolving arrangement.
        </p>
        <button onClick={onEnter}>Enter and listen</button>
      </div>
    </div>
  );
}

function Dashboard({ data, message, busy, onAction, audioEnabled, onAudioStart }) {
  const health = data.garden.flowerTotal
    ? data.garden.livingFlowerTotal / data.garden.flowerTotal
    : 0;
  const activeStemCount = data.music.stems.filter((stem) => stem.gain > 0).length;

  return (
    <>
      <header className="hero">
        <div>
          <div className="section-kicker">Shared cortex / single garden MVP</div>
          <h1>Living Garden</h1>
          <p>
            Players tend a sculptural digital planter while the server translates its ecosystem into an
            adaptive eight-stem synth mix.
          </p>
        </div>
        <button className="listen-button" onClick={onAudioStart}>
          {audioEnabled ? "Audio unlocked" : "Unlock audio"}
        </button>
      </header>

      <main className="layout">
        <section className="gallery">
          <GardenScene data={data} />
          <div className="status-strip" aria-live="polite">
            <span>{data.garden.weatherName}</span>
            <span>{data.garden.dayPhase}</span>
            <span>{activeStemCount}/8 stems</span>
            <span>{data.garden.collectedSpores} collected spores</span>
          </div>
          {message && <p className="message">{message}</p>}
        </section>

        <aside className="right-rail">
          <section className="panel">
            <div className="section-kicker">Ecosystem</div>
            <h2>Autonomous state</h2>
            <PercentBar label="Water" value={data.garden.water} tone="water" />
            <PercentBar label="Pollution" value={data.garden.pollution} tone="pollution" />
            <PercentBar label="Health" value={Math.max(0, Math.min(1, health))} tone="health" />
            <div className="spore-readout">
              <strong>{Math.floor(data.garden.spores)}</strong>
              <span>mature spores in soil</span>
            </div>
          </section>
          <ActionPanel data={data} onAction={onAction} busy={busy} />
          <StemMixer music={data.music} />
          <FieldJournal data={data} />
        </aside>
      </main>
    </>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const audio = useLivingGardenAudio(data?.music);

  const loadGarden = async () => {
    const next = await fetchGarden();
    setData(next);
  };

  useEffect(() => {
    loadGarden().catch((error) => setMessage(error.message));
    const timer = window.setInterval(() => {
      loadGarden().catch((error) => setMessage(error.message));
    }, refreshMs);
    return () => window.clearInterval(timer);
  }, []);

  const handleAction = async (action, payload) => {
    setBusy(true);
    try {
      const next = await sendGardenAction(action, payload);
      setData(next);
      setMessage(next.message);
    } catch (error) {
      setData(error.payload ?? data);
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const enterGarden = async () => {
    const started = await audio.start();
    if (!started) setMessage("This browser cannot start Web Audio.");
  };

  const appClass = useMemo(() => {
    if (!data) return "app";
    return `app app--${data.garden.weather} app--${data.garden.dayPhase}`;
  }, [data]);

  if (!data) {
    return (
      <div className="app loading">
        <p>Waking the shared garden...</p>
      </div>
    );
  }

  return (
    <div className={appClass}>
      {!audio.enabled && <AudioGate onEnter={enterGarden} />}
      <Dashboard
        data={data}
        message={message}
        busy={busy}
        onAction={handleAction}
        audioEnabled={audio.enabled}
        onAudioStart={enterGarden}
      />
    </div>
  );
}
