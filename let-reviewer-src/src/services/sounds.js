// Sound engine using Web Audio API — no external files needed
let audioCtx = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(frequency, duration, type = 'sine', volume = 0.3, delay = 0) {
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (e) {
    // Silently fail if audio isn't available
  }
}

function playNoise(duration, volume = 0.1) {
  try {
    const ctx = getContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
    }
    
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch (e) {
    // Silently fail
  }
}

// ===== SOUND EFFECTS =====

// Soft click when selecting an answer bubble
export function playSelect() {
  playTone(800, 0.08, 'sine', 0.15);
}

// Satisfying tap when clicking Next/Submit
export function playClick() {
  playTone(600, 0.06, 'square', 0.08);
  playTone(900, 0.06, 'square', 0.06, 0.03);
}

// Cheerful ascending ding for correct answer
export function playCorrect() {
  playTone(523, 0.12, 'sine', 0.25);        // C
  playTone(659, 0.12, 'sine', 0.25, 0.1);   // E
  playTone(784, 0.2, 'sine', 0.3, 0.2);     // G
}

// Buzzy descending tone for wrong answer
export function playWrong() {
  playTone(300, 0.15, 'square', 0.15);
  playTone(200, 0.25, 'square', 0.12, 0.12);
}

// Quick swoosh for advancing to next question
export function playNext() {
  playTone(400, 0.08, 'sine', 0.1);
  playTone(600, 0.08, 'sine', 0.12, 0.05);
}

// Victory fanfare for finishing a quiz
export function playFinish() {
  playTone(523, 0.15, 'sine', 0.3);         // C
  playTone(659, 0.15, 'sine', 0.3, 0.12);   // E
  playTone(784, 0.15, 'sine', 0.3, 0.24);   // G
  playTone(1047, 0.4, 'sine', 0.35, 0.36);  // High C
}

// Sad descending tones for game over
export function playGameOver() {
  playTone(400, 0.2, 'sine', 0.2);
  playTone(350, 0.2, 'sine', 0.2, 0.18);
  playTone(300, 0.2, 'sine', 0.2, 0.36);
  playTone(200, 0.5, 'sine', 0.15, 0.54);
}

// Timer tick when time is running low
export function playTimerTick() {
  playTone(1000, 0.05, 'square', 0.08);
}

// Power-up sound for gaining a life
export function playLifeGained() {
  playTone(500, 0.1, 'sine', 0.2);
  playTone(700, 0.1, 'sine', 0.25, 0.08);
  playTone(900, 0.15, 'sine', 0.3, 0.16);
}

// Confirmation blip for report sent
export function playConfirm() {
  playTone(600, 0.1, 'sine', 0.15);
  playTone(800, 0.15, 'sine', 0.2, 0.08);
}

// Timeout buzzer
export function playTimeout() {
  playNoise(0.3, 0.12);
  playTone(250, 0.3, 'sawtooth', 0.1);
}

// Streak milestone (every 5 correct in survival)
export function playStreak() {
  playTone(600, 0.08, 'sine', 0.2);
  playTone(800, 0.08, 'sine', 0.2, 0.06);
  playTone(1000, 0.12, 'sine', 0.25, 0.12);
}
