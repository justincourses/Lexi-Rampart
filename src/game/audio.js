import { g } from './shared.js';
import { STORAGE_KEYS } from './constants.js';
import { MUSIC_TRACKS } from './music-tracks.js';
import { readStorage, writeStorage } from './storage.js';

export function attachAudio() {
  g.sound = {
    muted: readStorage(STORAGE_KEYS.muted) === 'true',
    context: null,
    files: {
      click: './assets/audio/ui/click1.ogg',
      denied: './assets/audio/ui/switch7.ogg',
      match: './assets/audio/impact/impactGlass_medium_002.ogg',
      hit: './assets/audio/impact/impactPunch_medium_002.ogg',
      wall: './assets/audio/impact/impactWood_heavy_001.ogg',
      forge: './assets/audio/impact/impactBell_heavy_002.ogg'
    },

    init() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!this.context && AudioContext) this.context = new AudioContext();
      if (this.context && this.context.state === 'suspended') this.context.resume().catch(() => {});
    },

    play(name, volume = .2, rate = 1) {
      if (this.muted || !this.files[name]) return;
      const audio = new Audio(this.files[name]);
      audio.volume = volume;
      audio.playbackRate = rate;
      audio.play().catch(() => {});
    },

    tone(frequency, duration = .12, type = 'sine', volume = .035, delay = 0) {
      if (this.muted || !this.context) return;
      const start = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + .025);
    },

    match(chain, counts) {
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      const base = { ember: 196, mana: 294, moss: 247, coin: 330 }[dominant];
      const lift = Math.min(chain - 1, 5) * 32;
      this.play('match', .23, Math.min(1.55, .9 + chain * .12));
      this.tone(base + lift, .18, 'triangle', .045);
      this.tone((base + lift) * 1.5, .24, 'sine', .028, .07);
    },

    cascade(chain) {
      const base = 310 + Math.min(chain, 6) * 42;
      this.tone(base, .13, 'triangle', .04);
      this.tone(base * 1.25, .16, 'triangle', .04, .1);
      this.tone(base * 1.5, .22, 'sine', .035, .2);
    },

    toggle() {
      if (this.muted) {
        this.muted = false;
        this.init();
        this.play('click', .28, 1.12);
      } else {
        this.play('click', .2, .85);
        this.muted = true;
        window.speechSynthesis?.cancel();
      }
      writeStorage(STORAGE_KEYS.muted, String(this.muted));
      g.updateSoundButton();
    }
  };

  g.music = {
    enabled: readStorage(STORAGE_KEYS.music, 'true') !== 'false',
    playing: false,
    timer: 0,
    master: null,
    filter: null,
    step: 0,
    trackIndex: (() => {
      const stored = Number.parseInt(readStorage(STORAGE_KEYS.musicTrack, '0'), 10);
      return Number.isFinite(stored) ? Math.max(0, stored) % MUSIC_TRACKS.length : 0;
    })(),
    trackCycle: 0,
    lastAnnouncedKey: '',
    nextNoteAt: 0,

    currentTrack() {
      return MUSIC_TRACKS[this.trackIndex % MUSIC_TRACKS.length];
    },

    announceTrack() {
      const track = this.currentTrack();
      const key = `${g.state.sessionId}:${this.trackIndex}`;
      if (g.state.started && this.lastAnnouncedKey !== key) {
        this.lastAnnouncedKey = key;
        g.addLog(`军乐换曲：${track.title}（${track.source}）`);
      }
      g.updateMusicButton();
    },

    advanceTrack(announce = true) {
      this.trackIndex = (this.trackIndex + 1) % MUSIC_TRACKS.length;
      writeStorage(STORAGE_KEYS.musicTrack, String(this.trackIndex));
      this.step = 0;
      this.trackCycle = 0;
      if (announce) this.announceTrack();
      return this.currentTrack();
    },

    skip() {
      const resumePlayback = this.playing;
      if (resumePlayback) this.stop();
      const track = this.advanceTrack(true);
      if (resumePlayback) this.start();
      g.sound.play('click', .16, 1.24);
      return track;
    },

    midiToFrequency(note) {
      return 440 * (2 ** ((note - 69) / 12));
    },

    playNote(note, when, duration, type, volume) {
      if (!this.master || !g.sound.context || note === null) return;
      const oscillator = g.sound.context.createOscillator();
      const gain = g.sound.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(this.midiToFrequency(note), when);
      gain.gain.setValueAtTime(.0001, when);
      gain.gain.exponentialRampToValueAtTime(volume, when + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
      oscillator.connect(gain).connect(this.master);
      oscillator.start(when);
      oscillator.stop(when + duration + .03);
    },

    schedule() {
      if (!this.playing || !g.sound.context) return;
      while (this.nextNoteAt < g.sound.context.currentTime + .45) {
        const track = this.currentTrack();
        const stepLength = 60 / track.bpm / 2;
        const index = this.step;
        this.playNote(track.melody[index], this.nextNoteAt, stepLength * .78, 'triangle', .018);
        this.playNote(track.bass[index], this.nextNoteAt, stepLength * 1.65, 'square', .008);
        this.playNote(track.harmony[index], this.nextNoteAt, stepLength * 1.25, 'sine', .006);
        this.nextNoteAt += stepLength;
        this.step += 1;
        if (this.step >= track.melody.length) {
          this.step = 0;
          this.trackCycle += 1;
          if (this.trackCycle >= track.cycles) this.advanceTrack(true);
        }
      }
    },

    start() {
      if (!this.enabled || this.playing || !g.state.started || g.state.paused || g.state.gameOver) return;
      g.sound.init();
      if (!g.sound.context) return;
      this.master = g.sound.context.createGain();
      this.filter = g.sound.context.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 2400;
      this.master.gain.value = .9;
      this.master.connect(this.filter).connect(g.sound.context.destination);
      this.playing = true;
      this.nextNoteAt = g.sound.context.currentTime + .06;
      this.announceTrack();
      this.schedule();
      this.timer = window.setInterval(() => this.schedule(), 100);
      g.updateMusicButton();
    },

    stop() {
      window.clearInterval(this.timer);
      this.timer = 0;
      const master = this.master;
      if (master && g.sound.context) {
        const now = g.sound.context.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(.0001, now, .045);
        window.setTimeout(() => {
          try { master.disconnect(); } catch (error) { /* Already disconnected. */ }
        }, 260);
      }
      this.master = null;
      this.filter = null;
      this.playing = false;
      g.updateMusicButton();
    },

    toggle() {
      this.enabled = !this.enabled;
      writeStorage(STORAGE_KEYS.music, String(this.enabled));
      if (this.enabled) {
        g.sound.init();
        this.start();
        g.sound.play('click', .18, 1.18);
      } else {
        g.sound.play('click', .16, .82);
        this.stop();
      }
      g.updateMusicButton();
    }
  };

}
