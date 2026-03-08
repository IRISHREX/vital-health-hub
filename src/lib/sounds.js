// Sound system for the application
// Uses Web Audio API to generate sounds without external files

const SOUND_SETTINGS_KEY = 'app_sound_settings';

const defaultSettings = {
  enabled: true,
  volume: 0.5,
  categories: {
    click: true,
    success: true,
    error: true,
    delete: true,
    notification: true,
    urgent: true,
    emergency: true,
    broadcast: true,
  },
};

export const getSoundSettings = () => {
  try {
    const stored = localStorage.getItem(SOUND_SETTINGS_KEY);
    if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {}
  return defaultSettings;
};

export const saveSoundSettings = (settings) => {
  localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(settings));
};

let audioCtx = null;
const getAudioContext = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

const playTone = (frequency, duration, type = 'sine', volumeMultiplier = 1) => {
  const settings = getSoundSettings();
  if (!settings.enabled) return;
  
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    const vol = settings.volume * volumeMultiplier;
    gainNode.gain.setValueAtTime(vol, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {}
};

const playSequence = (notes, volumeMultiplier = 1) => {
  const settings = getSoundSettings();
  if (!settings.enabled) return;

  try {
    const ctx = getAudioContext();
    let time = ctx.currentTime;
    
    notes.forEach(({ freq, dur, type = 'sine' }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(settings.volume * volumeMultiplier, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + dur);
      time += dur * 0.8;
    });
  } catch {}
};

// Sound definitions
export const sounds = {
  click: () => {
    const s = getSoundSettings();
    if (!s.categories.click) return;
    playTone(800, 0.08, 'sine', 0.3);
  },

  success: () => {
    const s = getSoundSettings();
    if (!s.categories.success) return;
    playSequence([
      { freq: 523, dur: 0.12 },
      { freq: 659, dur: 0.12 },
      { freq: 784, dur: 0.2 },
    ], 0.5);
  },

  error: () => {
    const s = getSoundSettings();
    if (!s.categories.error) return;
    playSequence([
      { freq: 300, dur: 0.15, type: 'square' },
      { freq: 250, dur: 0.2, type: 'square' },
    ], 0.4);
  },

  delete: () => {
    const s = getSoundSettings();
    if (!s.categories.delete) return;
    playSequence([
      { freq: 600, dur: 0.1 },
      { freq: 400, dur: 0.1 },
      { freq: 250, dur: 0.2 },
    ], 0.4);
  },

  notification: () => {
    const s = getSoundSettings();
    if (!s.categories.notification) return;
    playSequence([
      { freq: 880, dur: 0.1 },
      { freq: 1100, dur: 0.15 },
    ], 0.5);
  },

  urgent: () => {
    const s = getSoundSettings();
    if (!s.categories.urgent) return;
    playSequence([
      { freq: 880, dur: 0.12, type: 'square' },
      { freq: 1000, dur: 0.12, type: 'square' },
      { freq: 880, dur: 0.12, type: 'square' },
      { freq: 1000, dur: 0.15, type: 'square' },
    ], 0.6);
  },

  emergency: () => {
    const s = getSoundSettings();
    if (!s.categories.emergency) return;
    playSequence([
      { freq: 1200, dur: 0.15, type: 'sawtooth' },
      { freq: 800, dur: 0.15, type: 'sawtooth' },
      { freq: 1200, dur: 0.15, type: 'sawtooth' },
      { freq: 800, dur: 0.15, type: 'sawtooth' },
      { freq: 1400, dur: 0.25, type: 'sawtooth' },
    ], 0.7);
  },

  broadcast: () => {
    const s = getSoundSettings();
    if (!s.categories.broadcast) return;
    playSequence([
      { freq: 440, dur: 0.15 },
      { freq: 550, dur: 0.15 },
      { freq: 660, dur: 0.15 },
      { freq: 880, dur: 0.25 },
    ], 0.5);
  },

  update: () => {
    const s = getSoundSettings();
    if (!s.categories.success) return;
    playSequence([
      { freq: 600, dur: 0.1 },
      { freq: 800, dur: 0.15 },
    ], 0.4);
  },
};

export const playSound = (soundName) => {
  if (sounds[soundName]) sounds[soundName]();
};
