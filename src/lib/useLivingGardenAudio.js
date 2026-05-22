import { useCallback, useEffect, useRef, useState } from "react";

function createStemGraph(context, destination, stem) {
  const input = context.createGain();
  const filter = context.createBiquadFilter();
  const pan = context.createStereoPanner();
  const motion = context.createOscillator();
  const motionGain = context.createGain();
  const depth = context.createGain();

  input.gain.value = 0;
  filter.type = stem.type === "bass" ? "lowpass" : "bandpass";
  filter.frequency.value = stem.filterHz;
  filter.Q.value = stem.type === "noise" ? 0.4 : 0.9;
  pan.pan.value = stem.pan;

  motion.type = "sine";
  motion.frequency.value = stem.movement;
  motionGain.gain.value = stem.type === "pulse" ? 0.18 : 0.045;
  depth.gain.value = stem.type === "pulse" ? 0.22 : 0.06;
  motion.connect(motionGain);
  motionGain.connect(input.gain);

  const oscillators = stem.frequencies.map((frequency, index) => {
    const oscillator = context.createOscillator();
    const voiceGain = context.createGain();

    oscillator.type = stem.wave;
    oscillator.frequency.value = frequency;
    oscillator.detune.value = index * 4 - 3;
    voiceGain.gain.value = 1 / Math.max(stem.frequencies.length, 1);

    oscillator.connect(voiceGain);
    voiceGain.connect(input);
    oscillator.start();

    return oscillator;
  });

  input.connect(filter);
  filter.connect(pan);
  pan.connect(destination);
  motion.start();

  return {
    input,
    filter,
    pan,
    motion,
    oscillators,
    stop() {
      for (const oscillator of oscillators) oscillator.stop();
      motion.stop();
      input.disconnect();
      filter.disconnect();
      pan.disconnect();
    },
  };
}

function setParam(param, value, context, rampSeconds = 1.8) {
  param.cancelScheduledValues(context.currentTime);
  param.setTargetAtTime(value, context.currentTime, rampSeconds);
}

export function useLivingGardenAudio(music) {
  const contextRef = useRef(null);
  const masterRef = useRef(null);
  const stemsRef = useRef(new Map());
  const [enabled, setEnabled] = useState(false);

  const start = useCallback(async () => {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return false;

    if (!contextRef.current) {
      const context = new AudioContext();
      const master = context.createGain();
      master.gain.value = 0.62;
      master.connect(context.destination);
      contextRef.current = context;
      masterRef.current = master;
    }

    if (contextRef.current.state === "suspended") await contextRef.current.resume();
    setEnabled(true);
    return true;
  }, []);

  useEffect(() => {
    if (!enabled || !music || !contextRef.current || !masterRef.current) return;

    const context = contextRef.current;
    const existing = stemsRef.current;
    const nextIds = new Set(music.stems.map((stem) => stem.id));

    for (const [id, graph] of existing.entries()) {
      if (!nextIds.has(id)) {
        graph.stop();
        existing.delete(id);
      }
    }

    for (const stem of music.stems) {
      if (!existing.has(stem.id)) {
        existing.set(stem.id, createStemGraph(context, masterRef.current, stem));
      }

      const graph = existing.get(stem.id);
      setParam(graph.input.gain, stem.gain, context);
      setParam(graph.filter.frequency, Math.max(80, stem.filterHz), context);
      setParam(graph.pan.pan, stem.pan, context);

      stem.frequencies.forEach((frequency, index) => {
        const oscillator = graph.oscillators[index];
        if (oscillator) setParam(oscillator.frequency, frequency, context, 0.8);
      });
    }
  }, [enabled, music]);

  useEffect(() => {
    return () => {
      for (const graph of stemsRef.current.values()) graph.stop();
      stemsRef.current.clear();
      if (contextRef.current) contextRef.current.close();
    };
  }, []);

  return {
    enabled,
    start,
  };
}
