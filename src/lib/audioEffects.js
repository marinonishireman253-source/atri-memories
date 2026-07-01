// Web Audio API Dynamic Sound Synthesizer - ATRI Memories
// This module synthesizes retro cel-shaded/VN style audio effects dynamically in the browser
// without needing static audio asset files, guaranteeing compatibility and fast loading.

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isMuted() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem('atri-audio-muted') === 'true';
}

export function setMuted(muted) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('atri-audio-muted', muted ? 'true' : 'false');
  // Dispatch custom event to sync cross-component UI state immediately
  window.dispatchEvent(new Event('atri-audio-mute-toggle'));
}

// 1. Light retro 8-bit typewriter beep sound
export function playTypewriterBeep() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  // Use a soft sine or triangle wave for retro beep
  osc.type = 'triangle';

  // Randomize pitch slightly to make the typing sound more alive and natural
  const pitch = 440 + Math.random() * 80;
  osc.frequency.setValueAtTime(pitch, ctx.currentTime);

  // Smooth micro-envelope (Attack: 0.005s, Decay: 0.035s)
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.012, ctx.currentTime + 0.005); // low volume to avoid annoyance
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.045);
}

// 2. Heavy rubber ink stamp thud sound (For Favorite stamp press)
export function playStampThud() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const noiseGain = ctx.createGain();
  const mainGain = ctx.createGain();

  // Low frequency thud oscillator
  osc.type = 'sine';
  // Pitch sweep from 150Hz down to 30Hz to emulate impact
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.12);

  // Main thud envelope
  mainGain.gain.setValueAtTime(0, ctx.currentTime);
  mainGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

  // Generate synthetic white noise for paper friction click
  const bufferSize = ctx.sampleRate * 0.05; // 50ms of noise
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;

  // Bandpass filter to make the noise sound like paper impact click (around 800Hz)
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  filter.Q.setValueAtTime(2.0, ctx.currentTime);

  noiseGain.gain.setValueAtTime(0, ctx.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.005);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.045);

  // Connect components
  osc.connect(mainGain);
  noiseNode.connect(filter);
  filter.connect(noiseGain);

  mainGain.connect(ctx.destination);
  noiseGain.connect(ctx.destination);

  // Play
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.26);
  noiseNode.start(ctx.currentTime);
  noiseNode.stop(ctx.currentTime + 0.05);
}

// 3. Short metallic cassette deck physical click sound
export function playCassetteClick() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sine';
  // Fast high pitch click (around 2200Hz)
  osc.frequency.setValueAtTime(2200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.02);

  // Extremely sharp decay envelope
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.002);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.022);
}
