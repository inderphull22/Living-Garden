import { useEffect, useMemo, useState } from "react";
import { GardenScene } from "./components/GardenScene.jsx";
import { flowerSvgs } from "./components/FlowerCards.jsx";
import { fetchGarden, sendGardenAction } from "./lib/api.js";
import { useLivingGardenAudio } from "./lib/useLivingGardenAudio.js";

const refreshMs = 15000;

function PlantGrid({ data, activeSpecies, onSelect, onPlant, busy }) {
  const flowers = Object.entries(data.catalog.flowers);

  return (
    <div className="grid" role="group" aria-label="Select a plant">
      {flowers.map(([id, flower]) => (
        <button
          key={id}
          className={`card ${activeSpecies === id ? "active" : ""}`}
          onClick={() => onSelect(id)}
          disabled={busy}
        >
          <div className="card-art">{flowerSvgs[id]}</div>
          <span className="card-label">{flower.name}</span>
        </button>
      ))}
    </div>
  );
}

function EcosystemMeters({ data }) {
  const health = data.garden.flowerTotal
    ? data.garden.livingFlowerTotal / data.garden.flowerTotal
    : 0;

  return (
    <div className="meters">
      <div className="meter-row">
        <span className="meter-label">Water</span>
        <div className="meter-track">
          <div className="meter-fill meter-fill--water" style={{ width: `${data.garden.water * 100}%` }} />
        </div>
        <span className="meter-val">{Math.round(data.garden.water * 100)}%</span>
      </div>
      <div className="meter-row">
        <span className="meter-label">Pollution</span>
        <div className="meter-track">
          <div className="meter-fill meter-fill--pollution" style={{ width: `${data.garden.pollution * 100}%` }} />
        </div>
        <span className="meter-val">{Math.round(data.garden.pollution * 100)}%</span>
      </div>
      <div className="meter-row">
        <span className="meter-label">Health</span>
        <div className="meter-track">
          <div className="meter-fill meter-fill--health" style={{ width: `${Math.max(0, Math.min(1, health)) * 100}%` }} />
        </div>
        <span className="meter-val">{Math.round(Math.max(0, Math.min(1, health)) * 100)}%</span>
      </div>
    </div>
  );
}

function StemMixer({ music }) {
  return (
    <div className="stem-section">
      <div className="stem-meta">
        <span>{music.tempo} BPM</span>
        <span>{music.dayPhase}</span>
        <span>{music.weather}</span>
      </div>
      <div className="stem-list">
        {music.stems.map((stem) => (
          <div key={stem.id} className={`stem ${stem.gain > 0 ? "is-active" : ""}`}>
            <div className="stem-info">
              <strong>{stem.label}</strong>
              <span>{stem.type}</span>
            </div>
            <div className="stem-gain">
              <i style={{ width: `${Math.min(stem.gain / 0.72, 1) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Player({ music, audioEnabled, onAudioStart, data }) {
  const activeStemCount = music.stems.filter((s) => s.gain > 0).length;

  return (
    <footer className="player">
      <div className="now-playing">
        <div className="album">
          <svg width="100%" height="100%" viewBox="0 0 48 48" style={{ position: "relative", zIndex: 1 }}>
            <circle cx="18" cy="18" r="6" fill="rgba(255,255,255,0.1)" />
            <path d="M 5 35 Q 15 28 24 32 Q 35 38 45 30" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none" />
          </svg>
        </div>
        <div className="track-meta">
          <span className="track-title">A Moment of Stillness</span>
          <span className="track-artist">{activeStemCount}/8 stems · {data.garden.dayPhase}</span>
        </div>
      </div>
      <div className="controls">
        <button className="ctrl play" onClick={onAudioStart} aria-label="Play / Pause">
          {audioEnabled ? (
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <rect x="2" y="1" width="2.5" height="12" fill="currentColor" />
              <rect x="7.5" y="1" width="2.5" height="12" fill="currentColor" />
            </svg>
          ) : (
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <path d="M 2 1 L 11 7 L 2 13 Z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
      <div className="progress-wrap">
        <div className="status-pills">
          <span>{data.garden.weatherName}</span>
          <span>{data.garden.collectedSpores} spores</span>
          <span>{Math.floor(data.garden.spores)} in soil</span>
        </div>
        <div className="vu">
          <span /><span /><span /><span /><span />
        </div>
      </div>
    </footer>
  );
}

function AudioGate({ onEnter }) {
  return (
    <div className="audio-gate">
      <div className="gate-card">
        <h1 className="gate-title">FLORA</h1>
        <p className="gate-sub">A moment of stillness</p>
        <p className="gate-desc">
          Open the terrarium to unlock audio. Every flower and creature will
          become a stem in the evolving arrangement.
        </p>
        <button className="gate-btn" onClick={onEnter}>Enter and listen</button>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [activeSpecies, setActiveSpecies] = useState("luminis");
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

  const handlePlant = () => {
    handleAction("plant", { species: activeSpecies });
  };

  const enterGarden = async () => {
    const started = await audio.start();
    if (!started) setMessage("This browser cannot start Web Audio.");
  };

  if (!data) {
    return (
      <div className="stage loading">
        <div className="loader">
          <div className="loader-bar"><div style={{ width: "40%" }} /></div>
          <div className="loader-text">Waking the garden</div>
        </div>
      </div>
    );
  }

  return (
    <div className="stage">
      {!audio.enabled && <AudioGate onEnter={enterGarden} />}

      <GardenScene data={data} />

      <aside className="panel">
        <header className="panel-header">
          <h1 className="panel-title">FLORA</h1>
          <p className="panel-sub">Select a Plant</p>
        </header>

        <PlantGrid
          data={data}
          activeSpecies={activeSpecies}
          onSelect={setActiveSpecies}
          onPlant={handlePlant}
          busy={busy}
        />

        <div className="action-row">
          <button className="action-btn plant-btn" disabled={busy} onClick={handlePlant}>
            Plant {data.catalog.flowers[activeSpecies]?.name}
          </button>
        </div>

        <div className="care-row">
          <button className="action-btn" disabled={busy} onClick={() => handleAction("water")}>Water</button>
          <button className="action-btn" disabled={busy} onClick={() => handleAction("clean")}>Clean</button>
          <button className="action-btn" disabled={busy} onClick={() => handleAction("collect")}>Collect spores</button>
        </div>

        <EcosystemMeters data={data} />

        {data.garden.journal.creatures.length > 0 && (
          <div className="creature-section">
            <span className="section-label">Discovered</span>
            <div className="creature-tags">
              {data.garden.journal.creatures.map((id) => (
                <span key={id} className="creature-tag">{data.catalog.creatures[id].name}</span>
              ))}
            </div>
          </div>
        )}

        {Object.entries(data.catalog.creatures)
          .filter(([id]) => !data.garden.creatures[id].attracted)
          .length > 0 && (
          <div className="creature-section">
            <span className="section-label">Attract</span>
            <div className="creature-btns">
              {Object.entries(data.catalog.creatures)
                .filter(([id]) => !data.garden.creatures[id].attracted)
                .map(([id, creature]) => (
                  <button
                    key={id}
                    className="action-btn small"
                    disabled={busy || data.garden.collectedSpores < creature.cost}
                    onClick={() => handleAction("attract", { species: id })}
                  >
                    {creature.name} <span className="cost">{creature.cost}sp</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {message && <p className="message">{message}</p>}

        <StemMixer music={data.music} />
      </aside>

      <Player
        music={data.music}
        audioEnabled={audio.enabled}
        onAudioStart={enterGarden}
        data={data}
      />
    </div>
  );
}
