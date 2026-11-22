/* ==========================================================================
   ReaBoy v1.0.1 BETA — Interactive Emulation Lab & Hardware Visualizer
   BJ Studios — Manchester, England
   ========================================================================== */

(function () {
  'use strict';

  // --- Utilities ---
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  let toastTimer = null;
  function showToast(msg) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  // --- Mobile Navigation Toggle ---
  const mobileBtn = $('#mobile-menu-btn');
  const navLinks = $('#nav-links');
  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      mobileBtn.setAttribute('aria-expanded', String(open));
    });
    $$('a', navLinks).forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        mobileBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // --- Scroll Reveal ---
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  // --- Viewport-Aware Lazy Video Playback ---
  const lazyVideos = $$('.top12-card video');
  if ('IntersectionObserver' in window && lazyVideos.length) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const videoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting && !prefersReducedMotion) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { rootMargin: '120px 0px', threshold: 0.15 }
    );
    lazyVideos.forEach((v) => videoObserver.observe(v));
  }

  // --- One-Click Copy Buttons ---
  $$('[data-copy-target]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const target = document.getElementById(btn.dataset.copyTarget);
      if (!target) return;
      const text = target.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!');
      } catch {
        const area = document.createElement('textarea');
        area.value = text;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
        showToast('Copied to clipboard!');
      }
    });
  });

  // ==========================================================================
  // 1. Web Audio API 4-Channel Game Boy APU Synthesizer + Oscilloscope
  // ==========================================================================
  let audioCtx = null;
  let analyser = null;
  let masterGain = null;

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.28;
      masterGain.connect(analyser);
      analyser.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSquareNote(freq, startTime, duration, vol = 0.45) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  let bootAudioBuffer = null;
  function loadActualBootAudio() {
    const ctx = ensureAudio();
    if (!ctx || bootAudioBuffer) return;
    fetch('assets/audio/dmg_boot_actual.mp3')
      .then(res => res.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => { bootAudioBuffer = decoded; })
      .catch(() => {});
  }

  function playBootChime() {
    const ctx = ensureAudio();
    if (!ctx) return;
    loadActualBootAudio();

    if (bootAudioBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = bootAudioBuffer;
      src.connect(masterGain);
      src.start(0);
      setScopeLabel('CH1 · NINTENDO BOOT CHIME (ROM CAPTURE)');
      return;
    }

    const now = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1048.58, now);
    osc.frequency.setValueAtTime(2080.51, now + 0.034);
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.setValueAtTime(0.55, now + 0.034);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.88);
    setScopeLabel('CH1 · NINTENDO BOOT CHIME');
  }

  function playCh1Sweep() {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime + 0.01;

    // Channel 1 hardware frequency sweep (NR10 register demonstration)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.38);

    setScopeLabel('CH1 · HARDWARE FREQUENCY SWEEP');
  }

  function playButtonTone(btnName) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const t = ctx.currentTime;
    const freqMap = {
      UP: 587.33,
      DOWN: 440.0,
      LEFT: 493.88,
      RIGHT: 523.25,
      A: 880.0,
      B: 659.25,
      START: 1046.5,
      SELECT: 783.99,
    };
    playSquareNote(freqMap[btnName] || 660, t, 0.09, 0.3);
  }

  function setScopeLabel(text) {
    const lbl = $('#scope-channel-label');
    if (lbl) lbl.textContent = text;
  }

  function playApuChannel(ch) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime + 0.02;

    if (ch === 'chime') {
      playBootChime();
    } else if (ch === 'ch1') {
      playCh1Sweep();
    } else if (ch === 'ch2') {
      setScopeLabel('CH2 · PULSE LEAD HARMONY');
      const notes = [659.25, 493.88, 523.25, 587.33, 523.25, 493.88, 440.0, 523.25, 659.25];
      notes.forEach((f, idx) => playSquareNote(f, now + idx * 0.12, 0.11, 0.42));
    } else if (ch === 'ch3') {
      setScopeLabel('CH3 · 4-BIT WAVE RAM BASS');
      const bass = [130.81, 164.81, 196.0, 164.81, 146.83, 174.61, 220.0, 196.0];
      bass.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.14);
        gain.gain.setValueAtTime(0.65, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.14 + 0.13);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.14);
      });
    } else if (ch === 'ch4') {
      setScopeLabel('CH4 · POLYNOMIAL LFSR NOISE');
      const hits = [0, 0.18, 0.36, 0.5, 0.68, 0.84];
      hits.forEach((offset, idx) => {
        const dur = idx % 2 === 0 ? 0.11 : 0.06;
        const bufSize = Math.floor(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        // Simulate stepped 7-bit LFSR noise
        let hold = 0;
        const step = idx % 2 === 0 ? 6 : 3;
        for (let i = 0; i < bufSize; i++) {
          if (i % step === 0) hold = Math.random() > 0.5 ? 0.7 : -0.7;
          data[i] = hold;
        }
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = buffer;
        gain.gain.setValueAtTime(0.5, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + dur);
        src.connect(gain);
        gain.connect(masterGain);
        src.start(now + offset);
      });
    }
  }

  $$('[data-apu]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('[data-apu]').forEach((b) => b.classList.remove('apu-btn-featured', 'active'));
      btn.classList.add('apu-btn-featured', 'active');
      playApuChannel(btn.dataset.apu);
    });
  });

  // Live Oscilloscope Canvas Loop
  const scopeCanvas = $('#apu-scope');
  if (scopeCanvas) {
    const sctx = scopeCanvas.getContext('2d');
    const timeData = new Uint8Array(1024);

    function drawScope() {
      requestAnimationFrame(drawScope);
      const w = scopeCanvas.width;
      const h = scopeCanvas.height;

      sctx.fillStyle = '#08120a';
      sctx.fillRect(0, 0, w, h);

      // Subtle scope grid
      sctx.strokeStyle = 'rgba(155, 188, 15, 0.12)';
      sctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        sctx.beginPath();
        sctx.moveTo(x, 0);
        sctx.lineTo(x, h);
        sctx.stroke();
      }
      for (let y = 0; y < h; y += 35) {
        sctx.beginPath();
        sctx.moveTo(0, y);
        sctx.lineTo(w, y);
        sctx.stroke();
      }

      sctx.strokeStyle = '#9bbc0f';
      sctx.lineWidth = 2.4;
      sctx.beginPath();

      if (analyser) {
        analyser.getByteTimeDomainData(timeData);
        const slice = w / timeData.length;
        let x = 0;
        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) sctx.moveTo(x, y);
          else sctx.lineTo(x, y);
          x += slice;
        }
      } else {
        // Gentle standby pulse line
        const t = performance.now() * 0.002;
        for (let x = 0; x < w; x += 4) {
          const y = h / 2 + Math.sin(x * 0.03 + t) * 4;
          if (x === 0) sctx.moveTo(x, y);
          else sctx.lineTo(x, y);
        }
      }
      sctx.stroke();
    }
    drawScope();
  }

  // ==========================================================================
  // 3. Interactive DMG-01 Handheld Console (Video / Pixel Boot Sim / Palette)
  // ==========================================================================
  const dmgVideo = $('#dmg-video');
  const dmgCanvas = $('#dmg-canvas');
  const dmgFrame = $('#dmg-screen-frame');
  const modeVideoBtn = $('#mode-video-btn');
  const modeCanvasBtn = $('#mode-canvas-btn');
  const paletteToggleBtn = $('#palette-toggle-btn');
  const chimeBtn = $('#chime-btn');

  let canvasMode = false;
  let bootY = -16;
  let lastBtnText = 'PRESS ANY BUTTON';
  let animHandle = null;

  function renderDmgCanvas() {
    if (!dmgCanvas || !canvasMode) return;
    const ctx = dmgCanvas.getContext('2d');
    const w = dmgCanvas.width;
    const h = dmgCanvas.height;

    // Classic DMG olive background
    ctx.fillStyle = '#9bbc0f';
    ctx.fillRect(0, 0, w, h);

    // Subtle border
    ctx.strokeStyle = '#306230';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Animate logo drop down to center (y = 58)
    if (bootY < 58) {
      bootY += 1.4;
      if (bootY >= 58) {
        bootY = 58;
        playBootChime();
      }
    }

    // Pixelated ReaBoy Logo
    ctx.fillStyle = '#0f380f';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ReaBoy', w / 2, bootY);

    ctx.fillStyle = '#306230';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('v1.0.1 BETA · DMG-01', w / 2, bootY + 14);

    if (bootY >= 58) {
      ctx.fillStyle = '#0f380f';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('SM83 CPU: READY ($0100)', w / 2, 102);
      ctx.fillStyle = '#306230';
      ctx.fillText(lastBtnText, w / 2, 122);
    }

    animHandle = requestAnimationFrame(renderDmgCanvas);
  }

  if (modeVideoBtn && modeCanvasBtn && dmgVideo && dmgCanvas) {
    modeVideoBtn.addEventListener('click', () => {
      canvasMode = false;
      cancelAnimationFrame(animHandle);
      dmgCanvas.hidden = true;
      dmgVideo.hidden = false;
      dmgVideo.play().catch(() => {});
      modeVideoBtn.classList.add('active');
      modeCanvasBtn.classList.remove('active');
    });

    modeCanvasBtn.addEventListener('click', () => {
      canvasMode = true;
      bootY = -14;
      dmgVideo.hidden = true;
      dmgCanvas.hidden = false;
      modeCanvasBtn.classList.add('active');
      modeVideoBtn.classList.remove('active');
      renderDmgCanvas();
    });
  }

  if (paletteToggleBtn && dmgFrame) {
    let gray = false;
    paletteToggleBtn.addEventListener('click', () => {
      gray = !gray;
      dmgFrame.classList.toggle('grayscale', gray);
      paletteToggleBtn.textContent = gray ? 'Palette: Grayscale' : 'Palette: Classic Green';
      paletteToggleBtn.classList.toggle('active', gray);
    });
  }

  if (chimeBtn) {
    chimeBtn.addEventListener('click', () => {
      playBootChime();
      showToast('♪ Classic DMG-01 Boot Chime');
    });
  }

  const scopeChimeBtn = $('#scope-chime-quick-btn');
  if (scopeChimeBtn) {
    scopeChimeBtn.addEventListener('click', () => {
      playBootChime();
      showToast('♪ Nintendo Boot Chime');
    });
  }

  // Interactive Tactile Game Boy Console Click -> Play Boot Chime & Switch Playable Games!
  const dmgConsole = $('#dmg-console');
  const dmgPlaylist = [
    { title: "Tetris (1989)", video: "assets/video/tetris.mp4?v=1.1.0", poster: "assets/img/shots/tetris.png" },
    { title: "Super Mario Land (1989)", video: "assets/video/super-mario-land.mp4", poster: "assets/img/shots/super-mario-land.png" },
    { title: "The Legend of Zelda: Link's Awakening (1993)", video: "assets/video/zelda-links-awakening.mp4", poster: "assets/img/shots/legend-of-zelda-the-link-s-awakening.png" },
    { title: "Pokémon Red (1996)", video: "assets/video/pokemon-red.mp4", poster: "assets/img/shots/pokemon-red.png" },
    { title: "Metroid II: Return of Samus (1991)", video: "assets/video/metroid-2.mp4", poster: "assets/img/shots/metroid-ii-return-of-samus.png" },
    { title: "Kirby's Dream Land (1992)", video: "assets/video/kirbys-dream-land.mp4", poster: "assets/img/shots/kirby-s-dream-land.png" },
    { title: "Donkey Kong '94 (1994)", video: "assets/video/donkey-kong.mp4", poster: "assets/img/shots/donkey-kong.png" },
    { title: "Dr. Mario (1990)", video: "assets/video/dr-mario.mp4", poster: "assets/img/shots/dr-mario.png" },
    { title: "Mega Man (1991)", video: "assets/video/mega-man.mp4", poster: "assets/img/shots/mega-man.png" },
    { title: "DuckTales (1990)", video: "assets/video/ducktales.mp4", poster: "assets/img/shots/ducktales.png" }
  ];
  // Randomize Hero Game Boy playlist so every session starts fresh
  for (let i = dmgPlaylist.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dmgPlaylist[i], dmgPlaylist[j]] = [dmgPlaylist[j], dmgPlaylist[i]];
  }
  let dmgGameIdx = 0;

  function switchDmgGame(step = 1) {
    if (!dmgVideo) return;
    dmgGameIdx = (dmgGameIdx + step + dmgPlaylist.length) % dmgPlaylist.length;
    const game = dmgPlaylist[dmgGameIdx];
    
    dmgVideo.src = game.video;
    dmgVideo.poster = game.poster;
    dmgVideo.currentTime = 0;
    dmgVideo.play().catch(() => {});
    showToast(`🎮 ReaBoy: ${game.title}`);
  }

  if (dmgConsole) {
    dmgConsole.setAttribute('title', 'Click to switch games and hear authentic 1989 DMG sounds!');
    dmgConsole.addEventListener('click', (e) => {
      const isControl = e.target.closest('[data-gb-btn]');
      if (!isControl) {
        playBootChime();
        switchDmgGame(1);
      }
      dmgConsole.classList.add('dmg-active');
      setTimeout(() => dmgConsole.classList.remove('dmg-active'), 160);
    });

    if (dmgVideo) {
      dmgVideo.addEventListener('ended', () => {
        switchDmgGame(1);
      });
    }
  }

  // Tactile Hardware Buttons
  $$('[data-gb-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.gbBtn;
      playButtonTone(name);

      if (name === 'START') {
        playBootChime();
        switchDmgGame(1);
      } else if (name === 'SELECT' || name === 'RIGHT' || name === 'A') {
        switchDmgGame(1);
      } else if (name === 'LEFT' || name === 'B') {
        switchDmgGame(-1);
      } else {
        switchDmgGame(1);
      }
    });
  });

  // ==========================================================================
  // 4. Client-Side .gb Cartridge Header Drag & Drop Inspector ($0104-$014F)
  // ==========================================================================
  const dropZone = $('#rom-drop-zone');
  const fileInput = $('#rom-file-input');

  const MBC_MAP = {
    0x00: { name: '0x00 · ROM ONLY', supported: 'PASS', note: 'Fully supported! Drag onto ReaBoy.exe to play.' },
    0x01: { name: '0x01 · MBC1', supported: 'PASS', note: 'Fully supported (up to 2 MiB ROM).' },
    0x02: { name: '0x02 · MBC1 + RAM', supported: 'PASS', note: 'Fully supported (up to 32 KiB RAM).' },
    0x03: { name: '0x03 · MBC1 + RAM + BATTERY', supported: 'PASS', note: 'Fully supported with automatic battery saves in %APPDATA%\\BJStudios\\ReaBoy\\saves.' },
    0x05: { name: '0x05 · MBC2', supported: 'PASS', note: 'Fully supported with built-in 512×4-bit internal RAM (e.g. F-1 Race).' },
    0x06: { name: '0x06 · MBC2 + BATTERY', supported: 'PASS', note: 'Fully supported with battery-backed 512×4-bit internal RAM saves.' },
    0x08: { name: '0x08 · ROM + RAM', supported: 'PASS', note: 'Fully supported.' },
    0x09: { name: '0x09 · ROM + RAM + BATTERY', supported: 'PASS', note: 'Fully supported with battery saves.' },
    0x0f: { name: '0x0F · MBC3 + TIMER + BATTERY', supported: 'PASS', note: 'Fully supported with hardware Real-Time Clock (RTC) latching.' },
    0x10: { name: '0x10 · MBC3 + TIMER + RAM + BATT', supported: 'PASS', note: 'Fully supported with RTC timekeeping and battery saves.' },
    0x11: { name: '0x11 · MBC3', supported: 'PASS', note: 'Fully supported.' },
    0x12: { name: '0x12 · MBC3 + RAM', supported: 'PASS', note: 'Fully supported.' },
    0x13: { name: '0x13 · MBC3 + RAM + BATTERY', supported: 'PASS', note: 'Fully supported with RTC and battery saves (e.g. Pokémon Red, Blue, Crystal).' },
    0x19: { name: '0x19 · MBC5', supported: 'PASS', note: 'Fully supported (up to 8 MiB ROM).' },
    0x1a: { name: '0x1A · MBC5 + RAM', supported: 'PASS', note: 'Fully supported.' },
    0x1b: { name: '0x1B · MBC5 + RAM + BATTERY', supported: 'PASS', note: 'Fully supported with battery saves (e.g. Zelda: Oracle of Ages, Seasons, Wario Land 3).' },
    0x1c: { name: '0x1C · MBC5 + RUMBLE', supported: 'PASS', note: 'Fully supported.' },
    0x1d: { name: '0x1D · MBC5 + RUMBLE + RAM', supported: 'PASS', note: 'Fully supported.' },
    0x1e: { name: '0x1E · MBC5 + RUMBLE + RAM + BATT', supported: 'PASS', note: 'Fully supported with rumble and battery saves.' },
    0x22: { name: '0x22 · MBC7 + ACCEL + EEPROM', supported: 'PASS', note: 'Fully supported with accelerometer tilt and 93LC56 SPI EEPROM (Kirby\'s Tilt \'n\' Tumble).' },
    0xfd: { name: '0xFD · HuC3 + EEPROM + RTC', supported: 'PASS', note: 'Fully supported with HuC3 command parser and RTC (Pocket Family GB2).' },
    0xfe: { name: '0xFE · HuC1 + RAM + BATTERY', supported: 'PASS', note: 'Fully supported with infrared transceiver emulation.' },
  };

  const RAM_SIZES = {
    0x00: 'None (0 KiB)',
    0x01: '2 KiB (Unused)',
    0x02: '8 KiB (1 Bank)',
    0x03: '32 KiB (4 Banks)',
    0x04: '128 KiB (16 Banks)',
    0x05: '64 KiB (8 Banks)',
  };

  function updateInspectorUI({ title, mapper, romSize, ramSize, checksum, hw, verdict, note }) {
    if ($('#rom-title')) $('#rom-title').textContent = title;
    if ($('#rom-mapper')) $('#rom-mapper').textContent = mapper;
    if ($('#rom-size')) $('#rom-size').textContent = romSize;
    if ($('#rom-ram')) $('#rom-ram').textContent = ramSize;
    if ($('#rom-checksum')) $('#rom-checksum').textContent = checksum;
    if ($('#rom-hw')) $('#rom-hw').textContent = hw;
    if ($('#rom-note')) $('#rom-note').innerHTML = note;

    const badge = $('#rom-verdict');
    if (badge) {
      badge.className = 'verdict-badge';
      if (verdict === 'PASS') {
        badge.classList.add('verdict-pass');
        badge.textContent = 'SUPPORTED · BETA';
      } else if (verdict === 'WARN') {
        badge.classList.add('verdict-warn');
        badge.textContent = 'CHECK HEADER';
      } else {
        badge.classList.add('verdict-roadmap');
        badge.textContent = 'ROADMAP (POST-BETA)';
      }
    }
  }

  function inspectRomBytes(bytes, filename) {
    if (bytes.length < 0x150) {
      updateInspectorUI({
        title: filename,
        mapper: 'INVALID FILE',
        romSize: `${bytes.length} bytes`,
        ramSize: 'N/A',
        checksum: 'TOO SMALL',
        hw: 'Not a valid .gb ROM',
        verdict: 'WARN',
        note: 'File is smaller than 336 bytes ($0150) and does not contain a valid Game Boy cartridge header.',
      });
      return;
    }

    // Extract title ($0134-$0143)
    let titleChars = '';
    for (let i = 0x134; i <= 0x143; i++) {
      const b = bytes[i];
      if (b === 0) break;
      if (b >= 32 && b <= 126) titleChars += String.fromCharCode(b);
    }
    const title = titleChars.trim() || filename;

    const cgbFlag = bytes[0x143];
    const isCgbOnly = cgbFlag === 0xc0;
    const hw = isCgbOnly ? 'Game Boy Color ONLY' : cgbFlag === 0x80 ? 'DMG + CGB Dual Mode' : 'DMG-01 Monochrome';

    const mapperCode = bytes[0x147];
    const mbcInfo = MBC_MAP[mapperCode] || {
      name: `0x${mapperCode.toString(16).toUpperCase().padStart(2, '0')} · UNSUPPORTED MBC`,
      supported: 'ROADMAP',
      note: 'This cartridge mapper is not yet supported in ReaBoy v1.0.1 BETA (ROM-Only & MBC1 supported).',
    };

    const romCode = bytes[0x148];
    const romKiB = romCode <= 8 ? 32 * (1 << romCode) : 0;
    const romSize = romKiB ? (romKiB >= 1024 ? `${romKiB / 1024} MiB (${romKiB / 16} Banks)` : `${romKiB} KiB (${romKiB / 16} Banks)`) : `Code 0x${romCode.toString(16)}`;
    const ramSize = RAM_SIZES[bytes[0x149]] || `Code 0x${bytes[0x149].toString(16)}`;

    // Exact DMG-01 Boot ROM header checksum algorithm ($0134-$014C)
    let x = 0;
    for (let i = 0x134; i <= 0x14c; i++) {
      x = (x - bytes[i] - 1) & 0xff;
    }
    const storedChecksum = bytes[0x14d];
    const checksumValid = x === storedChecksum;
    const checksumText = `0x${storedChecksum.toString(16).toUpperCase().padStart(2, '0')} · ${checksumValid ? 'VALID (Z=1)' : `MISMATCH (calc 0x${x.toString(16).toUpperCase()})`}`;

    let verdict = mbcInfo.supported;
    let note = mbcInfo.note;
    if (isCgbOnly) {
      verdict = 'PASS';
      note = 'Game Boy Color Exclusive title ($C0). Fully supported in ReaBoy! Runs in native CGB mode with 2× double-speed CPU, banked VRAM/WRAM, and 15-bit RGB555 colour palettes.';
    } else if (cgbFlag === 0x80) {
      verdict = 'PASS';
      note = 'Dual Game Boy & Game Boy Color title ($80). Fully supported! Play in native CGB colour or authentic monochrome DMG mode via Emulation > Hardware Mode.';
    } else if (!checksumValid) {
      verdict = 'WARN';
      note = 'Header checksum ($014D) failed DMG verification! Original DMG boot ROM will trap at $00FA unless Skip Intro is enabled.';
    }

    updateInspectorUI({
      title,
      mapper: mbcInfo.name,
      romSize,
      ramSize,
      checksum: checksumText,
      hw,
      verdict,
      note,
    });
    playBootChime();
    showToast(`Inspected "${title}" locally!`);
  }

  const SAMPLES = {
    tetris: {
      title: 'TETRIS',
      mapper: '0x00 · ROM ONLY',
      romSize: '32 KiB (2 Banks)',
      ramSize: 'None (0 KiB)',
      checksum: '0x0A · VALID (Z=1)',
      hw: 'DMG-01 Monochrome',
      verdict: 'PASS',
      note: 'Primary ReaBoy integration test! Verified 3,600 frames PASS (PC=$02ED, LCDC=$D3, LY=144) with both Bootix and original DMG boot ROM.',
    },
    drmario: {
      title: 'DR. MARIO',
      mapper: '0x00 · ROM ONLY',
      romSize: '32 KiB (2 Banks)',
      ramSize: 'None (0 KiB)',
      checksum: '0x58 · VALID (Z=1)',
      hw: 'DMG-01 Monochrome',
      verdict: 'PASS',
      note: 'Fixed in ReaBoy v1.0.1 BETA! LCD-off STAT now correctly reports Mode 0 so setup-screen transitions complete cleanly (3,600 frames PASS).',
    },
    marioland: {
      title: 'SUPER MARIO LAND',
      mapper: '0x01 · MBC1',
      romSize: '64 KiB (4 Banks)',
      ramSize: 'None (0 KiB)',
      checksum: '0x2C · VALID (Z=1)',
      hw: 'DMG-01 Monochrome',
      verdict: 'PASS',
      note: 'Verified playable in ReaBoy v1.0.1 BETA (World 1-1 capture, 3,600 frames PASS, PC=$0297, LCDC=$C3).',
    },
    zelda: {
      title: "ZELDA (LINK'S AWAKENING)",
      mapper: '0x03 · MBC1 + RAM + BATTERY',
      romSize: '512 KiB (32 Banks)',
      ramSize: '8 KiB (1 Bank)',
      checksum: '0x71 · VALID (Z=1)',
      hw: 'DMG-01 Monochrome',
      verdict: 'PASS',
      note: 'Verified 3,600 frames PASS in ReaBoy with automatic MBC1 battery-backed SRAM persistence!',
    },
    pokemon_red: {
      title: 'POKEMON RED',
      mapper: '0x13 · MBC3 + RAM + BATTERY',
      romSize: '1024 KiB (64 Banks)',
      ramSize: '32 KiB (4 Banks)',
      checksum: '0x6F · VALID (Z=1)',
      hw: 'DMG-01 Monochrome',
      verdict: 'PASS',
      note: 'Original Game Boy MBC3 breakthrough! Verified 3,600 frames PASS with full hardware Real-Time Clock (RTC) and battery save round-tripping in ReaBoy!',
    },
    crystal: {
      title: 'POKEMON CRYSTAL',
      mapper: '0x10 · MBC3 + TIMER + RAM + BATT',
      romSize: '2048 KiB (128 Banks)',
      ramSize: '32 KiB (4 Banks)',
      checksum: '0x91 · VALID (Z=1)',
      hw: 'Game Boy Color ONLY ($C0)',
      verdict: 'PASS',
      note: 'Game Boy Color Exclusive ($C0) breakthrough! Full 2× double-speed CPU, CGB banked VRAM/WRAM, hardware RTC, and custom 15-bit RGB555 colour palettes verified PASS!',
    },
    oracle: {
      title: 'ZELDA: ORACLE OF AGES',
      mapper: '0x1B · MBC5 + RAM + BATTERY',
      romSize: '1024 KiB (64 Banks)',
      ramSize: '32 KiB (4 Banks)',
      checksum: '0x8D · VALID (Z=1)',
      hw: 'Game Boy Color ONLY ($C0)',
      verdict: 'PASS',
      note: 'Game Boy Color MBC5 breakthrough! 2× double-speed CPU, 16 KB VRAM, 32 KB WRAM, and battery save persistence verified PASS in ReaBoy!',
    },
  };

  $$('[data-sample]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const s = SAMPLES[btn.dataset.sample];
      if (s) {
        updateInspectorUI(s);
        playButtonTone('A');
      }
    });
  });

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => inspectRomBytes(new Uint8Array(reader.result), file.name);
      reader.readAsArrayBuffer(file);
    });

    ['dragenter', 'dragover'].forEach((ev) => {
      dropZone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach((ev) => {
      dropZone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => inspectRomBytes(new Uint8Array(reader.result), file.name);
      reader.readAsArrayBuffer(file);
    });
  }

  // ==========================================================================
  // 5. Project 007 Interactive 10-Step Boot Pipeline & SM83 Register Inspector
  // ==========================================================================
  const MILESTONES = [
    {
      addr: '$0000',
      title: '1. CPU & Stack Initialization',
      sub: 'LD SP, $FFFE · XOR A',
      cycles: 16,
      mapped: true,
      regs: { A: '$00', F: '$80', B: '$00', C: '$00', D: '$00', E: '$00', H: '$00', L: '$00', SP: '$FFFE', PC: '$0004' },
      detail: 'The Sharp SM83 boots at $0000 with the 256-byte boot ROM overlaid on memory. Stack pointer SP is set to top of HRAM ($FFFE) and A is zeroed.',
    },
    {
      addr: '$0007',
      title: '2. 8 KiB VRAM Wipe',
      sub: 'LD [HL-], A · BIT 7, H ($9FFF → $8000)',
      cycles: 262144,
      mapped: true,
      regs: { A: '$00', F: '$80', B: '$00', C: '$00', D: '$00', E: '$00', H: '$7F', L: '$FF', SP: '$FFFE', PC: '$000C' },
      detail: 'Clears all 8,192 bytes of Video RAM ($8000–$9FFF) to zero so no garbage tiles appear when the LCD turns on.',
    },
    {
      addr: '$0013',
      title: '3. Audio APU Initialization',
      sub: 'NR52=$80 · NR11=$80 · NR12=$F3 · NR50=$77',
      cycles: 262420,
      mapped: true,
      regs: { A: '$77', F: '$80', B: '$00', C: '$24', D: '$00', E: '$00', H: '$7F', L: '$FF', SP: '$FFFE', PC: '$001F' },
      detail: 'Powers up the 4-channel APU master switch ($FF26), configures Channel 1 square duty and volume envelope, and sets stereo panning.',
    },
    {
      addr: '$001F',
      title: '4. LCD Palette Setup',
      sub: 'LD A, $FC · LDH [$FF47], A (BGP)',
      cycles: 262448,
      mapped: true,
      regs: { A: '$FC', F: '$80', B: '$00', C: '$24', D: '$00', E: '$00', H: '$7F', L: '$FF', SP: '$FFFE', PC: '$0027' },
      detail: 'Loads Background Palette Register BGP ($FF47) with 11111100b ($FC) mapping 2-bit tile colours onto classic 4-shade olive green.',
    },
    {
      addr: '$0027',
      title: '5. Cartridge Logo Decompression',
      sub: 'Unpacks 48 bytes ($0104–$0133) → VRAM $8010',
      cycles: 289600,
      mapped: true,
      regs: { A: '$00', F: '$A0', B: '$00', C: '$00', D: '$01', E: '$34', H: '$81', L: '$90', SP: '$FFFE', PC: '$0048' },
      detail: 'Reads the 48-byte compressed logo from the inserted cartridge header and scales each 1-bit pixel 2×2 into 2-bit Game Boy tiles in VRAM.',
    },
    {
      addr: '$0048',
      title: '6. Tilemap Assembly',
      sub: 'Writes tile indices to BG Map $9910 & $992F',
      cycles: 294800,
      mapped: true,
      regs: { A: '$00', F: '$C0', B: '$00', C: '$00', D: '$00', E: '$19', H: '$99', L: '$04', SP: '$FFFE', PC: '$0056' },
      detail: 'Arranges the unpacked tiles across two rows in Background Map 0 so the full logo sits centered horizontally.',
    },
    {
      addr: '$0056',
      title: '7. LCD Power-On & VBlank Scroll',
      sub: 'SCY=$64 · LCDC=$91 · LY==144 sync loop',
      cycles: 22980000,
      mapped: true,
      regs: { A: '$83', F: '$20', B: '$00', C: '$13', D: '$00', E: '$D8', H: '$00', L: '$A8', SP: '$FFFE', PC: '$0094' },
      detail: 'Turns on the LCD (LCDC=$91), polls scanline LY ($FF44) for VBlank (line 144), smoothly decrements SCY to scroll the logo down, and fires the Channel 1 Ba-Ding chime!',
    },
    {
      addr: '$00E0',
      title: '8. Cartridge Logo Verification',
      sub: 'Compares $0104..$0133 vs internal ref $00A8',
      cycles: 23452100,
      mapped: true,
      regs: { A: '$00', F: '$C0', B: '$00', C: '$13', D: '$00', E: '$D8', H: '$00', L: '$D8', SP: '$FFFE', PC: '$00F1' },
      detail: 'Byte-by-byte hardware security check. If even 1 bit differs, the CPU traps forever at $00E9 (JR NZ, $00E9) — verified by our negative unit test!',
    },
    {
      addr: '$00F1',
      title: '9. Header Checksum Verification',
      sub: 'Sums $0134–$014D; must equal 0 (Z=1)',
      cycles: 23454180,
      mapped: true,
      regs: { A: '$00', F: '$B0', B: '$00', C: '$13', D: '$00', E: '$D8', H: '$01', L: '$4D', SP: '$FFFE', PC: '$00FC' },
      detail: 'Computes the cartridge header checksum across $0134–$014C + $014D. Reaching zero sets Z=1, H=1, C=1 (F=$B0). Invalid checksums trap at $00FA.',
    },
    {
      addr: '$00FE',
      title: '10. Boot ROM Unmap & $0100 Handover',
      sub: 'LD A, $01 · LDH [$FF50], A → PC=$0100',
      cycles: 23454204,
      mapped: false,
      regs: { A: '$01', F: '$B0', B: '$00', C: '$13', D: '$00', E: '$D8', H: '$01', L: '$4D', SP: '$FFFE', PC: '$0100' },
      detail: 'Writes $01 to hardware register $FF50, unmapping the boot ROM permanently until reset. Execution advances to $0100 with bit-exact DMG-01 registers!',
    },
  ];

  const milestoneList = $('#milestone-list');
  let activeMilestone = 9;
  let pipelineTimer = null;

  function selectMilestone(idx) {
    activeMilestone = idx;
    const m = MILESTONES[idx];
    $$('.milestone-item', milestoneList).forEach((el, i) => {
      el.classList.toggle('active', i === idx);
    });
    Object.entries(m.regs).forEach(([k, v]) => {
      const el = $(`#reg-${k}`);
      if (el) el.textContent = v;
    });
    $('#cycle-label').textContent = `T-Cycles: ${m.cycles.toLocaleString()}`;
    const stateEl = $('#bootrom-state');
    stateEl.textContent = m.mapped ? '$FF50 MAPPED (BOOT)' : '$FF50 UNMAPPED → GAME';
    stateEl.style.color = m.mapped ? '#ffd54f' : '#ccff2e';
    const pct = Math.max(4, Math.round((m.cycles / 23454204) * 100));
    $('#cycle-bar-fill').style.width = `${pct}%`;
    $('#milestone-detail').textContent = m.detail;
  }

  if (milestoneList) {
    MILESTONES.forEach((m, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'milestone-item';
      btn.innerHTML = `<span class="milestone-addr">${m.addr}</span><div><strong>${m.title}</strong><small>${m.sub}</small></div>`;
      btn.addEventListener('click', () => {
        clearInterval(pipelineTimer);
        selectMilestone(idx);
      });
      milestoneList.appendChild(btn);
    });
    selectMilestone(9);

    $('#pipeline-play-btn')?.addEventListener('click', () => {
      clearInterval(pipelineTimer);
      let step = 0;
      selectMilestone(0);
      pipelineTimer = setInterval(() => {
        step++;
        if (step >= MILESTONES.length) {
          clearInterval(pipelineTimer);
          playBootChime();
          return;
        }
        selectMilestone(step);
      }, 900);
    });

    $('#pipeline-reset-btn')?.addEventListener('click', () => {
      clearInterval(pipelineTimer);
      selectMilestone(0);
    });
  }

  // ==========================================================================
  // 6. Beta Game Compatibility Lab (Verified Telemetry + Local Test Logger)
  // ==========================================================================
  const DEFAULT_GAMES = [
    {
      title: 'Tetris (World)',
      mapper: 'ROM-Only',
      status: 'PASS',
      notes: '3,600 frames verified (boot=True/False) · 253.4M cycles · PC=$02ED · LCDC=$D3 · LY=144 · Primary integration test.',
    },
    {
      title: 'Dr. Mario (World)',
      mapper: 'ROM-Only',
      status: 'PASS',
      notes: 'v1.0.1 fix verified (LCD-off STAT Mode 0) · 3,600 frames · 253.3M cycles · PC=$0359 · LCDC=$83.',
    },
    {
      title: 'Super Mario Land (World) (Rev 1)',
      mapper: 'MBC1',
      status: 'PASS',
      notes: '3,600 frames verified · World 1-1 playable · 253.8M cycles · PC=$0297 · LCDC=$C3.',
    },
    {
      title: "The Legend of Zelda: Link's Awakening (Rev 2)",
      mapper: 'MBC1+RAM+BATT',
      status: 'PASS',
      notes: '3,600 frames verified · Battery SRAM persistence active · 254.5M cycles · PC=$03CE · LCDC=$C7.',
    },
  ];

  let verifiedLibrary = [];
  let currentLimit = 50;
  let activeAlpha = null;
  let activePlatform = 'ALL';
  let activeFilter = 'ALL';

  const dialog = document.getElementById('shot-dialog');
  const dialogTitle = document.getElementById('shot-dialog-title');
  const dialogImg = document.getElementById('shot-dialog-img');
  const dialogMeta = document.getElementById('shot-dialog-meta');
  const dialogClose = document.getElementById('shot-dialog-close');
  if (dialogClose && dialog) {
    dialogClose.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const inDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height
        && rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
      if (!inDialog) {
        dialog.close();
      }
    });
  }

  fetch('assets/all_verified_games.json?v=2.0.0')
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      verifiedLibrary = data;
      renderCompatTable();
    })
    .catch((err) => {
      console.warn('Could not load all_verified_games.json, trying verified_games.json', err);
      fetch('assets/verified_games.json?v=2.0.0')
        .then((r) => r.json())
        .then((data) => {
          verifiedLibrary = data;
          renderCompatTable();
        });
    });

  const STORAGE_KEY = 'reaboy_beta_tests_v1';
  function loadGames() {
    const base = verifiedLibrary.length > 0 ? verifiedLibrary : DEFAULT_GAMES;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return [...saved, ...base];
    } catch {
      return [...base];
    }
  }

  const compatTbody = $('#compat-tbody');
  const compatSearch = $('#compat-search');
  const compatCountLabel = $('#compat-count-label');

  function renderCompatTable() {
    if (!compatTbody) return;
    const q = (compatSearch?.value || '').trim().toLowerCase();
    const all = loadGames();
    const rows = all.filter((g) => {
      const matchesFilter = activeFilter === 'ALL' || (activeFilter === 'PASS' ? (g.status === 'PLAYABLE' || g.status === 'PASS' || g.isPlayable) : g.status === activeFilter);
      const matchesPlatform = activePlatform === 'ALL' || g.platform === activePlatform;

      const qMatches =
        !q ||
        (g.title || '').toLowerCase().includes(q) ||
        (g.canonicalFilename || '').toLowerCase().includes(q) ||
        (g.mapper || '').toLowerCase().includes(q) ||
        (g.platformBadge || '').toLowerCase().includes(q) ||
        (g.notes || '').toLowerCase().includes(q);

      let matchesAlpha = true;
      if (activeAlpha) {
        const firstLetter = (g.title || '').trim().toUpperCase()[0];
        const parts = activeAlpha.split('-');
        if (parts.length === 2) {
          matchesAlpha = firstLetter >= parts[0] && firstLetter <= parts[1];
        }
      }

      return matchesFilter && matchesPlatform && qMatches && matchesAlpha;
    });

    const limit = q ? Math.max(currentLimit, 100) : currentLimit;
    const displayRows = rows.slice(0, limit);

    if (compatCountLabel) {
      compatCountLabel.textContent = `Showing ${displayRows.length.toLocaleString()} of ${rows.length.toLocaleString()} verified games`;
    }

    compatTbody.innerHTML = displayRows
      .map((g) => {
        const shotSrc = g.screenshot || (g.slug ? `assets/img/shots/${g.slug}.png` : 'assets/img/shots/cgb/cgb-placeholder.png');

        let platBadge = `<span class="verdict-badge verdict-pass" style="font-size:0.72rem;">DMG-01</span>`;
        if (g.platform === 'CGB') {
          if (g.categoryBadge === 'Exclusive' || g.platformBadge?.includes('Exclusive')) {
            platBadge = `<span class="verdict-badge verdict-pass" style="font-size:0.72rem;">CGB Exclusive</span>`;
          } else {
            platBadge = `<span class="verdict-badge" style="font-size:0.72rem; background:rgba(255,193,7,0.15); color:#ffd166;">Dual DMG/CGB</span>`;
          }
        }

        const isPlayable = g.isPlayable || g.status === 'PLAYABLE' || g.status === 'PASS';
        const statusBadge = isPlayable
          ? `<span class="verdict-badge verdict-pass" style="font-size:0.72rem;">PLAYABLE</span>`
          : `<span class="verdict-badge" style="font-size:0.72rem; background:rgba(255,193,7,0.15); color:#ffd166;">BOOTS</span>`;

        const variantsBadge = g.variantCount > 0
          ? `<span style="background:rgba(47,224,117,0.14); color:var(--gb-0); font-size:0.68rem; padding:1px 5px; border-radius:3px; font-weight:600;" title="Includes tested releases across UK, USA, Europe, and regional languages">+${g.variantCount} regional variants</span>`
          : '';

        return `
      <tr>
        <td style="text-align:center;">
          <img src="${shotSrc}" onerror="this.onerror=null;this.src='assets/img/shots/cgb/cgb-placeholder.png';" loading="lazy" alt="${escapeHtml(g.title)}" class="compat-thumb" data-shot="${shotSrc}" data-title="${escapeHtml(g.title)}" data-meta="${escapeHtml(g.canonicalFilename || g.title)} · ${escapeHtml(g.mapper)} · ${escapeHtml(g.effectiveMode || g.platform || 'DMG')}" style="width:48px;height:43px;object-fit:cover;border-radius:3px;image-rendering:pixelated;border:1px solid rgba(0,0,0,0.18);display:block;cursor:pointer;margin:0 auto;">
        </td>
        <td>
          <strong>${escapeHtml(g.title)}</strong>
          <div style="font-size:0.72rem; color:var(--text-muted); font-family:var(--font-mono); margin-top:2px; display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
            <span>${escapeHtml(g.canonicalFilename || '')}</span>
            ${variantsBadge}
          </div>
        </td>
        <td>${platBadge}</td>
        <td><code>${escapeHtml(g.mapper)}</code></td>
        <td>${statusBadge}</td>
        <td style="font-size:0.82rem;">${escapeHtml(g.notes)}</td>
      </tr>`;
      })
      .join('');

    // Attach click listeners to thumbnails
    compatTbody.querySelectorAll('.compat-thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        if (!dialog) return;
        dialogTitle.textContent = thumb.dataset.title;
        dialogImg.onerror = () => { dialogImg.src = 'assets/img/shots/cgb/cgb-placeholder.png'; };
        dialogImg.src = thumb.dataset.shot;
        dialogMeta.textContent = thumb.dataset.meta;
        dialog.showModal();
      });
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  if (compatTbody) {
    renderCompatTable();
    compatSearch?.addEventListener('input', () => {
      currentLimit = 50;
      renderCompatTable();
    });

    $$('[data-platform]').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('[data-platform]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activePlatform = btn.dataset.platform;
        currentLimit = 50;
        renderCompatTable();
      });
    });

    $$('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('[data-filter]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        if (activeFilter === 'ALL') {
          // Reset alpha filter when "All" is clicked
          activeAlpha = null;
          $$('[data-alpha]').forEach((b) => b.classList.remove('active'));
        }
        currentLimit = 50;
        renderCompatTable();
      });
    });

    $$('[data-alpha]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const isCurrent = btn.classList.contains('active');
        $$('[data-alpha]').forEach((b) => b.classList.remove('active'));
        if (isCurrent) {
          activeAlpha = null;
          $('[data-filter="ALL"]')?.classList.add('active');
        } else {
          btn.classList.add('active');
          activeAlpha = btn.dataset.alpha;
          $('[data-filter="ALL"]')?.classList.remove('active');
        }
        currentLimit = 50;
        renderCompatTable();
      });
    });

    $('#load-more-btn')?.addEventListener('click', () => {
      currentLimit += 50;
      renderCompatTable();
      showToast('Loaded 50 more verified games');
    });

    $('#show-all-btn')?.addEventListener('click', () => {
      currentLimit = 9999;
      renderCompatTable();
      const allCount = loadGames().length;
      showToast('Showing all ' + allCount.toLocaleString() + ' verified games');
    });

    $('#beta-log-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = $('#log-title').value.trim();
      const mapper = $('#log-mapper').value;
      const status = $('#log-status').value;
      const notes = $('#log-notes').value.trim() || 'Logged locally in ReaBoy v1.0.1 BETA Compatibility Lab.';
      if (!title) return;

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      saved.push({ title, mapper, status, notes });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      e.target.reset();
      renderCompatTable();
      playButtonTone('START');
      showToast(`Added "${title}" to your Beta Test Log!`);
    });
  }

  // ------------------------------------------------------------
  // Interactive Gameplay Showcase Category Filter
  // ------------------------------------------------------------
  const showcaseChips = $$('.showcase-chip');
  if (showcaseChips.length) {
    showcaseChips.forEach((btn) => {
      btn.addEventListener('click', () => {
        showcaseChips.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.showcase || 'all';
        const cards = $$('.top12-card[data-cat]');
        cards.forEach((card) => {
          if (filter === 'all') {
            card.hidden = false;
          } else {
            const cats = (card.dataset.cat || '').split(' ');
            card.hidden = !cats.includes(filter);
          }
        });
      });
    });
  }

  // ------------------------------------------------------------
  // 1592-in-1 Verified Multi-Cartridge Screen Cycler
  // Plays dynamically from the complete 1,592-title compatibility list!
  // ------------------------------------------------------------
  const cartImg = $('#cart-screen-img');
  const cartId = $('#cart-game-id');
  const cartTitle = $('#cart-game-title');
  const cartGlitch = $('#cart-glitch');
  const compatCart = $('#compat-cart');

  if (cartImg && cartId && cartTitle) {
    // Initial high-profile classics while JSON loads
    let gamesList = [
      { id: '0001', title: 'Tetris (World)', shot: 'assets/img/shots/tetris.png' },
      { id: '0002', title: 'Super Mario Land', shot: 'assets/img/shots/super-mario-land.png' },
      { id: '0003', title: "Zelda: Link's Awakening", shot: 'assets/img/shots/legend-of-zelda-the-link-s-awakening.png' },
      { id: '0151', title: 'Pokémon Red', shot: 'assets/img/shots/pokemon-red.png' },
      { id: '0312', title: 'Metroid II: Return of Samus', shot: 'assets/img/shots/metroid-ii-return-of-samus.png' },
      { id: '0456', title: 'DuckTales', shot: 'assets/img/shots/ducktales.png' },
      { id: '0680', title: 'Castlevania: The Adventure', shot: 'assets/img/shots/castlevania-the-adventure.png' },
      { id: '0924', title: "Kirby's Dream Land", shot: 'assets/img/shots/kirby-s-dream-land.png' },
      { id: '1280', title: "Donkey Kong '94", shot: 'assets/img/shots/donkey-kong.png' },
      { id: '1592', title: 'Dr. Mario', shot: 'assets/img/shots/dr-mario.png' }
    ];
    // Randomize initial fallback games
    for (let i = gamesList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gamesList[i], gamesList[j]] = [gamesList[j], gamesList[i]];
    }

    let currentCartIdx = 0;
    let cycleTimer = null;

    function preload(url) {
      if (!url) return;
      const img = new Image();
      img.src = url;
    }

    cartImg.addEventListener('error', () => {
      cartImg.src = 'assets/img/shots/tetris.png';
    });

    function advanceTo(idx) {
      if (!gamesList.length) return;
      currentCartIdx = (idx + gamesList.length) % gamesList.length;
      const g = gamesList[currentCartIdx];

      if (cartGlitch) cartGlitch.classList.add('active');
      cartImg.style.opacity = '0.35';

      setTimeout(() => {
        cartImg.src = g.shot;
        cartId.textContent = `ROM #${g.id} / 1592`;
        cartTitle.textContent = g.title;
        cartImg.style.opacity = '1';
        if (cartGlitch) cartGlitch.classList.remove('active');
      }, 120);

      // Preload next 3 screenshots in sequence
      for (let i = 1; i <= 3; i++) {
        const nextG = gamesList[(currentCartIdx + i) % gamesList.length];
        if (nextG) preload(nextG.shot);
      }
    }

    function startTimer() {
      if (cycleTimer) clearInterval(cycleTimer);
      cycleTimer = setInterval(() => {
        advanceTo(currentCartIdx + 1);
      }, 2400);
    }

    // Allow user to click or use keyboard to advance cartridge
    if (compatCart) {
      compatCart.style.cursor = 'pointer';
      compatCart.setAttribute('role', 'button');
      compatCart.setAttribute('tabindex', '0');
      compatCart.setAttribute('aria-label', 'Cycle to next verified Game Boy cartridge screenshot');
      compatCart.setAttribute('title', 'Click or press Enter/Space to advance to next verified game');

      const triggerAdvance = () => {
        advanceTo(currentCartIdx + 1);
        startTimer();
      };

      compatCart.addEventListener('click', triggerAdvance);
      compatCart.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerAdvance();
        }
      });
    }

    // Load full verified compatibility database (1,430 vivid gameplay screens) and randomize
    fetch('assets/vivid_games.json')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const raw = data.map(g => ({
            id: String(g.Id || g.id || '').padStart(4, '0'),
            title: g.Title || g.title || 'Game Boy Title',
            shot: `assets/img/shots/${g.Slug || g.slug}.png`
          }));
          // Fisher-Yates random shuffle of the entire 1,592 game collection
          for (let i = raw.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [raw[i], raw[j]] = [raw[j], raw[i]];
          }
          gamesList = raw;
          currentCartIdx = 0;
          for (let i = 1; i <= 4; i++) {
            preload(gamesList[(currentCartIdx + i) % gamesList.length].shot);
          }
        }
      })
      .catch(err => {
        console.warn('Could not load vivid_games.json for cartridge cycler:', err);
      });

    // Initial preloads & start
    gamesList.slice(0, 5).forEach(g => preload(g.shot));
    startTimer();
  }

  // Showcase Filter Logic (18 Best Handheld Masterpieces)
  window.filterShowcase = function (filter) {
    const items = document.querySelectorAll('.showcase-item');
    const tabs = document.querySelectorAll('.showcase-filter-tabs .chip-btn');
    tabs.forEach(t => t.classList.remove('active'));
    const activeTab = document.getElementById('tab-' + filter);
    if (activeTab) activeTab.classList.add('active');

    items.forEach(item => {
      const platform = item.getAttribute('data-platform');
      if (filter === 'all' || platform === filter) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  };
})();
