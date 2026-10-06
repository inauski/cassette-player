(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  const deck = $('#deck');
  const audio = $('#audio');
  const fileInput = $('#fileInput');
  const playlistEl = $('#playlist');
  const emptyMsg = $('#emptyMsg');
  const labelTitle = $('#labelTitle');
  const packL = $('#packL');
  const packR = $('#packR');
  const lcdStatus = $('#lcdStatus');
  const lcdTrack = $('#lcdTrack');
  const lcdTime = $('#lcdTime');
  const lcdTitle = $('#lcdTitle');
  const seek = $('#seek');
  const volume = $('#volume');
  const timeCur = $('#timeCur');
  const timeDur = $('#timeDur');
  const stageCaption = $('#stageCaption');
  const dropOverlay = $('#dropOverlay');
  const addBtn = document.querySelector('label[for="fileInput"]');

  const btn = {
    prev: $('#btnPrev'), rew: $('#btnRew'), play: $('#btnPlay'), pause: $('#btnPause'),
    stop: $('#btnStop'), ff: $('#btnFf'), next: $('#btnNext'), eject: $('#btnEject'),
  };

  // Deben coincidir con --insert-ms y --door-ms en styles.css
  const INSERT_MS = 850;
  const DOOR_MS = 450;
  const STRIPES = ['#2f5da8', '#d7372f', '#1f8a70', '#e0a100', '#6b4fa0', '#3e4249'];
  const PACK_MIN = 24;
  const PACK_MAX = 54;
  const VU_SEGMENTS = 16;
  const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)$/i;

  const state = {
    tracks: [],      // { name, url, duration }
    index: -1,
    tapeIn: false,
    mode: 'empty',   // empty | loading | stop | play | pause | ff | rew
  };

  // Serializa las acciones con animación para que no se pisen entre sí
  let queue = Promise.resolve();
  const enqueue = (fn) => (queue = queue.then(fn).catch((err) => console.error(err)));
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /* ---------- Utilidades ---------- */

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function cleanName(fileName) {
    return fileName.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim() || fileName;
  }

  function truncate(text, max) {
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }

  const currentTrack = () => state.tracks[state.index] || null;

  /* ---------- Estado visual ---------- */

  const STATUS_TEXT = {
    empty: 'NO TAPE', loading: 'LOADING', stop: 'STOP', play: '▶ PLAY',
    pause: 'PAUSE', ff: '▶▶ FF', rew: '◀◀ REW',
  };

  function setMode(mode) {
    state.mode = mode;
    deck.dataset.mode = mode;
    lcdStatus.textContent = STATUS_TEXT[mode] || mode.toUpperCase();
    btn.play.classList.toggle('latched', mode === 'play');
    btn.pause.classList.toggle('latched', mode === 'pause');
    document.body.classList.toggle('has-caption', state.tapeIn && mode !== 'loading');
    renderPlaylist();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = mode === 'play' ? 'playing' : (mode === 'pause' ? 'paused' : 'none');
    }
  }

  function flashStatus(text) {
    lcdStatus.textContent = text;
    setTimeout(() => { lcdStatus.textContent = STATUS_TEXT[state.mode]; }, 1400);
  }

  function setLabel(track, i) {
    const name = track ? track.name : 'Sin cinta';
    labelTitle.textContent = truncate(name, 24);
    deck.style.setProperty('--stripe', STRIPES[Math.max(i, 0) % STRIPES.length]);
    stageCaption.textContent = track ? name : '';

    lcdTitle.textContent = track ? name : 'Añade canciones para empezar';
    lcdTrack.textContent = track
      ? `${String(i + 1).padStart(2, '0')}/${String(state.tracks.length).padStart(2, '0')}`
      : '--/--';

    // Marquesina si el título no cabe
    const box = lcdTitle.parentElement;
    box.classList.remove('marquee');
    requestAnimationFrame(() => {
      if (lcdTitle.scrollWidth > box.clientWidth) {
        box.style.setProperty('--marquee-dur', `${Math.max(6, name.length * 0.28)}s`);
        box.classList.add('marquee');
      }
    });

    if ('mediaSession' in navigator && track) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: name, artist: 'Tape Deck' });
    }
  }

  function setRangeFill(input) {
    const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty('--p', `${pct}%`);
  }

  /* ---------- Lista de canciones ---------- */

  function renderPlaylist() {
    emptyMsg.hidden = state.tracks.length > 0;
    playlistEl.innerHTML = '';
    state.tracks.forEach((t, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'track';
      if (i === state.index) b.classList.add('active');
      if (i === state.index && state.mode === 'play') b.classList.add('playing');
      b.dataset.index = i;
      b.innerHTML = `
        <span class="track-num">${i + 1}</span>
        <span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="track-name"></span>
        <span class="track-dur">${t.duration ? fmt(t.duration) : '--:--'}</span>`;
      b.querySelector('.track-name').textContent = t.name;
      b.title = t.name;
      li.appendChild(b);
      playlistEl.appendChild(li);
    });
  }

  function probeDuration(track) {
    const probe = new Audio();
    probe.preload = 'metadata';
    probe.addEventListener('loadedmetadata', () => {
      track.duration = probe.duration;
      probe.removeAttribute('src');
      renderPlaylist();
    }, { once: true });
    probe.src = track.url;
  }

  function addFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('audio/') || AUDIO_EXT.test(f.name));
    if (!files.length) {
      flashStatus('NO AUDIO');
      return;
    }
    for (const f of files) {
      const track = { name: cleanName(f.name), url: URL.createObjectURL(f), duration: null };
      state.tracks.push(track);
      probeDuration(track);
    }
    renderPlaylist();
    if (state.index >= 0) setLabel(currentTrack(), state.index); // actualiza "nn/total"
  }

  /* ---------- Animaciones del casete ---------- */

  async function insertTape() {
    if (state.tapeIn) return;
    setMode('loading');
    deck.classList.add('tape-in');
    await wait(INSERT_MS);
    deck.classList.add('door-closed');
    await wait(DOOR_MS);
    state.tapeIn = true;
    seek.disabled = false;
    setMode('stop');
  }

  async function ejectTape() {
    if (!state.tapeIn) return;
    stopScan(false);
    audio.pause();
    state.tapeIn = false;
    seek.disabled = true;
    setMode('loading');
    lcdStatus.textContent = 'EJECT';
    deck.classList.remove('door-closed');
    await wait(DOOR_MS);
    deck.classList.remove('tape-in');
    await wait(INSERT_MS);
    setMode('empty');
  }

  /* ---------- Reproducción ---------- */

  let actx = null;
  let analysers = null;

  // Se llama de forma síncrona dentro de un gesto del usuario (requisito de los navegadores)
  function ensureAudioGraph() {
    if (actx) {
      if (actx.state === 'suspended') actx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      actx = new AC();
      const source = actx.createMediaElementSource(audio);
      const splitter = actx.createChannelSplitter(2);
      analysers = [0, 1].map(() => {
        const a = actx.createAnalyser();
        a.fftSize = 1024;
        return a;
      });
      source.connect(actx.destination);
      source.connect(splitter);
      splitter.connect(analysers[0], 0);
      splitter.connect(analysers[1], 1);
    } catch (err) {
      console.warn('Vúmetro no disponible:', err);
      analysers = null;
    }
  }

  async function startPlayback() {
    try {
      await audio.play();
      setMode('play');
    } catch (err) {
      console.error(err);
      setMode('stop');
      flashStatus('ERROR');
    }
  }

  async function loadTrack(i, autoplay) {
    if (i < 0 || i >= state.tracks.length) return;
    if (state.tapeIn) await ejectTape();
    state.index = i;
    const track = currentTrack();
    audio.src = track.url;
    setLabel(track, i);
    renderPlaylist();
    await wait(200);
    await insertTape();
    if (autoplay) await startPlayback();
  }

  function cmdPlay() {
    ensureAudioGraph();
    enqueue(async () => {
      if (!state.tracks.length) {
        flashStatus('NO TAPE');
        addBtn.classList.remove('pulse');
        void addBtn.offsetWidth;
        addBtn.classList.add('pulse');
        return;
      }
      if (state.index < 0) return loadTrack(0, true);
      if (!state.tapeIn) await insertTape();
      if (state.mode !== 'play') await startPlayback();
    });
  }

  function cmdPause() {
    enqueue(async () => {
      if (state.mode === 'play') {
        audio.pause();
        setMode('pause');
      } else if (state.mode === 'pause') {
        ensureAudioGraph();
        await startPlayback();
      }
    });
  }

  function togglePlay() {
    if (state.mode === 'play') cmdPause();
    else cmdPlay();
  }

  function cmdStop() {
    enqueue(() => {
      if (!state.tapeIn) return;
      audio.pause();
      audio.currentTime = 0;
      setMode('stop');
    });
  }

  function cmdEject() {
    enqueue(async () => {
      if (state.tapeIn) await ejectTape();
      else if (state.index >= 0) await insertTape();
    });
  }

  function cmdNext() {
    ensureAudioGraph();
    enqueue(() => {
      if (!state.tracks.length) return;
      const wasPlaying = state.mode === 'play';
      const i = (state.index + 1) % state.tracks.length;
      return loadTrack(i, wasPlaying || state.index < 0);
    });
  }

  function cmdPrev() {
    ensureAudioGraph();
    enqueue(() => {
      if (!state.tracks.length) return;
      if (state.tapeIn && audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
      }
      const wasPlaying = state.mode === 'play';
      const i = (state.index - 1 + state.tracks.length) % state.tracks.length;
      return loadTrack(i, wasPlaying || state.index < 0);
    });
  }

  function seekBy(delta) {
    if (!state.tapeIn || !isFinite(audio.duration)) return;
    audio.currentTime = Math.min(Math.max(audio.currentTime + delta, 0), audio.duration);
  }

  /* ---------- Avance / rebobinado mantenido ---------- */

  let scan = null; // { dir, timer, resumeMode }

  function startScan(dir) {
    if (!state.tapeIn || scan || !['play', 'pause', 'stop'].includes(state.mode)) return;
    scan = { dir, resumeMode: state.mode };
    audio.pause();
    setMode(dir > 0 ? 'ff' : 'rew');
    scan.timer = setInterval(() => {
      seekBy(dir * 1.5);
      if (dir > 0 && audio.currentTime >= audio.duration - 0.05) stopScan(false);
      if (dir < 0 && audio.currentTime <= 0) stopScan(true);
    }, 80);
  }

  function stopScan(resume) {
    if (!scan) return;
    clearInterval(scan.timer);
    const { resumeMode } = scan;
    scan = null;
    btn.ff.classList.remove('down');
    btn.rew.classList.remove('down');
    if (resume && resumeMode === 'play') {
      startPlayback();
    } else if (state.tapeIn) {
      setMode(resumeMode === 'play' ? 'pause' : resumeMode);
    }
  }

  function bindScanKey(el, dir) {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      el.setPointerCapture(e.pointerId);
      el.classList.add('down');
      startScan(dir);
    });
    const end = () => { el.classList.remove('down'); stopScan(true); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    // Activación por teclado (Enter/Espacio sobre el botón): salto de 10 s
    el.addEventListener('click', (e) => { if (e.detail === 0) seekBy(dir * 10); });
  }

  /* ---------- Bucle de animación: carretes y vúmetro ---------- */

  function buildVu(el) {
    const segs = [];
    for (let i = 0; i < VU_SEGMENTS; i++) {
      const s = document.createElement('span');
      s.className = 'vu-seg';
      if (i >= VU_SEGMENTS - 3) s.classList.add('hot');
      else if (i >= VU_SEGMENTS - 6) s.classList.add('warn');
      el.appendChild(s);
      segs.push(s);
    }
    return { segs, level: 0, lit: -1 };
  }
  const vu = [buildVu($('#vuL')), buildVu($('#vuR'))];
  const vuBuf = new Float32Array(1024);

  function channelLevel(analyser) {
    analyser.getFloatTimeDomainData(vuBuf);
    let sum = 0;
    for (let i = 0; i < vuBuf.length; i++) sum += vuBuf[i] * vuBuf[i];
    const rms = Math.sqrt(sum / vuBuf.length);
    const db = 20 * Math.log10(rms || 1e-8);
    return Math.min(1, Math.max(0, (db + 42) / 42)); // -42 dB .. 0 dB → 0 .. 1
  }

  let lastTimeText = '';
  let draggingSeek = false;

  function frame() {
    // Tamaño de la cinta enrollada en cada carrete según el progreso
    const p = state.tapeIn && audio.duration ? audio.currentTime / audio.duration : 0;
    const area = PACK_MAX ** 2 - PACK_MIN ** 2;
    packL.setAttribute('r', Math.sqrt(PACK_MIN ** 2 + area * (1 - p)).toFixed(2));
    packR.setAttribute('r', Math.sqrt(PACK_MIN ** 2 + area * p).toFixed(2));

    // Tiempo y barra de progreso
    const t = state.tapeIn ? audio.currentTime : 0;
    const timeText = fmt(t);
    if (timeText !== lastTimeText) {
      lastTimeText = timeText;
      const [m, s] = timeText.split(':');
      lcdTime.textContent = `${m.padStart(2, '0')}:${s}`;
      timeCur.textContent = timeText;
    }
    if (!draggingSeek) {
      seek.value = Math.round(p * 1000);
      setRangeFill(seek);
    }

    // Vúmetro
    let levels = [0, 0];
    if (analysers && state.mode === 'play') {
      levels = analysers.map(channelLevel);
      if (levels[1] === 0) levels[1] = levels[0]; // fuentes mono
    }
    vu.forEach((meter, c) => {
      meter.level = Math.max(levels[c], meter.level * 0.88);
      const lit = Math.round(meter.level * VU_SEGMENTS);
      if (lit !== meter.lit) {
        meter.lit = lit;
        meter.segs.forEach((s, i) => s.classList.toggle('on', i < lit));
      }
    });

    requestAnimationFrame(frame);
  }

  /* ---------- Eventos ---------- */

  btn.play.addEventListener('click', cmdPlay);
  btn.pause.addEventListener('click', cmdPause);
  btn.stop.addEventListener('click', cmdStop);
  btn.eject.addEventListener('click', cmdEject);
  btn.next.addEventListener('click', cmdNext);
  btn.prev.addEventListener('click', cmdPrev);
  bindScanKey(btn.ff, 1);
  bindScanKey(btn.rew, -1);

  playlistEl.addEventListener('click', (e) => {
    const b = e.target.closest('.track');
    if (!b) return;
    const i = Number(b.dataset.index);
    ensureAudioGraph();
    enqueue(() => (i === state.index && state.tapeIn
      ? (state.mode === 'play' ? null : startPlayback())
      : loadTrack(i, true)));
  });

  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = '';
  });

  $('#clearBtn').addEventListener('click', () => {
    enqueue(async () => {
      await ejectTape();
      state.tracks.forEach((t) => URL.revokeObjectURL(t.url));
      state.tracks = [];
      state.index = -1;
      audio.removeAttribute('src');
      audio.load();
      setLabel(null, -1);
      setMode('empty');
    });
  });

  seek.addEventListener('input', () => {
    draggingSeek = true;
    setRangeFill(seek);
    if (isFinite(audio.duration)) timeCur.textContent = fmt((seek.value / 1000) * audio.duration);
  });
  seek.addEventListener('change', () => {
    if (state.tapeIn && isFinite(audio.duration)) audio.currentTime = (seek.value / 1000) * audio.duration;
    draggingSeek = false;
  });

  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value);
    setRangeFill(volume);
  });

  audio.addEventListener('loadedmetadata', () => {
    timeDur.textContent = fmt(audio.duration);
    const track = currentTrack();
    if (track && !track.duration) {
      track.duration = audio.duration;
      renderPlaylist();
    }
  });

  audio.addEventListener('ended', () => {
    enqueue(async () => {
      if (state.index < state.tracks.length - 1) {
        await loadTrack(state.index + 1, true);
      } else {
        setMode('stop');
        await ejectTape();
      }
    });
  });

  // Mantiene el estado si la reproducción se controla desde fuera (teclas multimedia del SO)
  audio.addEventListener('pause', () => {
    if (state.mode === 'play' && !scan && !audio.ended) setMode('pause');
  });
  audio.addEventListener('play', () => {
    if (state.tapeIn && state.mode !== 'play') setMode('play');
  });

  // Arrastrar y soltar
  let dragDepth = 0;
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
  window.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth++;
    dropOverlay.classList.add('show');
  });
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) dropOverlay.classList.remove('show');
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    dropOverlay.classList.remove('show');
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });

  // Atajos de teclado
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName;
    const onRange = tag === 'INPUT' && e.target.type === 'range';
    switch (e.key) {
      case ' ':
        if (tag === 'BUTTON' || tag === 'LABEL') return;
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
        if (onRange) return;
        e.preventDefault();
        seekBy(5);
        break;
      case 'ArrowLeft':
        if (onRange) return;
        e.preventDefault();
        seekBy(-5);
        break;
      case 'n': case 'N': cmdNext(); break;
      case 'p': case 'P': cmdPrev(); break;
      case 'e': case 'E': cmdEject(); break;
    }
  });

  // Teclas multimedia / controles del sistema
  if ('mediaSession' in navigator) {
    const ms = navigator.mediaSession;
    const handlers = {
      play: cmdPlay,
      pause: cmdPause,
      stop: cmdStop,
      nexttrack: cmdNext,
      previoustrack: cmdPrev,
      seekto: (d) => { if (state.tapeIn) audio.currentTime = d.seekTime; },
    };
    for (const [action, fn] of Object.entries(handlers)) {
      try { ms.setActionHandler(action, fn); } catch { /* acción no soportada */ }
    }
  }

  /* ---------- Inicio ---------- */

  audio.volume = Number(volume.value);
  setRangeFill(volume);
  setLabel(null, -1);
  setMode('empty');
  requestAnimationFrame(frame);
})();
