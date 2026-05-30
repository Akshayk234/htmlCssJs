/* ============================================
   SONIX — Music Player Logic (Real Audio)
============================================ */

// ─── Track Data ───────────────────────────────────────
const tracks = [
  {
    title:  "Tere Ishq Mein",
    artist: "Bilal Amir, Ahmed Butt",
    label:  "TERE",
    color:  "#e8ff00",
    src:    "tere_ishq_main.mp3"
  },
  // Add more: { title: "...", artist: "...", label: "LABL", color: "#ff4d00", src: "song.mp3" }
];

// ─── State ────────────────────────────────────────────
let currentIndex = 0;
let isPlaying    = false;
let isShuffle    = false;
let isRepeat     = false;

// ─── DOM Refs ─────────────────────────────────────────
const audio         = document.getElementById('audio-player');
const vinyl         = document.getElementById('vinyl');
const vinylTitle    = document.getElementById('vinyl-title');
const trackTitle    = document.getElementById('track-title');
const trackArtist   = document.getElementById('track-artist');
const progressFill  = document.getElementById('progress-fill');
const progressThumb = document.getElementById('progress-thumb');
const progressBar   = document.getElementById('progress-bar');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl   = document.getElementById('total-time');
const eqBars        = document.getElementById('eq-bars');
const playlistEl    = document.getElementById('playlist-list');
const volSlider     = document.getElementById('volume-slider');
const volLabel      = document.getElementById('vol-label');
const btnPlay       = document.getElementById('btn-play');
const btnPrev       = document.getElementById('btn-prev');
const btnNext       = document.getElementById('btn-next');
const btnShuffle    = document.getElementById('btn-shuffle');
const btnRepeat     = document.getElementById('btn-repeat');
const statusMsg     = document.getElementById('status-msg');

// ─── Helpers ──────────────────────────────────────────
function formatTime(sec) {
  if (isNaN(sec) || sec === Infinity) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function setStatus(msg, isError = false) {
  statusMsg.textContent = msg;
  statusMsg.style.color = isError ? 'var(--accent2)' : 'var(--muted)';
}

// ─── Render Playlist ──────────────────────────────────
function renderPlaylist() {
  playlistEl.innerHTML = '';
  tracks.forEach((t, i) => {
    const li = document.createElement('li');
    li.className = i === currentIndex ? 'active' : '';
    li.innerHTML = `
      <span class="pl-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="pl-info">
        <div class="pl-name">${t.title}</div>
        <div class="pl-artist">${t.artist}</div>
      </div>
      <span class="pl-dur" id="dur-${i}">--:--</span>
    `;
    li.addEventListener('click', () => loadTrack(i, true));
    playlistEl.appendChild(li);
  });
}

// ─── Load Track ───────────────────────────────────────
function loadTrack(index, autoplay = false) {
  currentIndex = index;
  const t = tracks[currentIndex];

  trackTitle.textContent  = t.title;
  trackArtist.textContent = t.artist;
  vinylTitle.textContent  = t.label;
  document.documentElement.style.setProperty('--accent', t.color);

  // Reset UI
  progressFill.style.width  = '0%';
  progressThumb.style.left  = '0%';
  currentTimeEl.textContent = '0:00';
  totalTimeEl.textContent   = '0:00';

  audio.src = t.src;
  audio.load();

  setStatus('Loading...');

  if (autoplay) {
    audio.addEventListener('canplay', function onCanPlay() {
      audio.removeEventListener('canplay', onCanPlay);
      audio.play()
        .then(() => setStatus(''))
        .catch(err => setStatus('Click ▶ to play (browser blocked autoplay)', true));
    }, { once: true });
  } else {
    isPlaying = false;
    updatePlayUI();
    setStatus('Click ▶ to play');
  }

  renderPlaylist();
  updateVolSliderStyle();
}

// ─── Play / Pause ─────────────────────────────────────
function togglePlay() {
  if (!audio.src || audio.src === window.location.href) {
    loadTrack(0, true);
    return;
  }

  if (audio.paused) {
    audio.play()
      .then(() => setStatus(''))
      .catch(err => {
        setStatus('Playback error: ' + err.message, true);
        console.error(err);
      });
  } else {
    audio.pause();
  }
}

function updatePlayUI() {
  const iconPlay  = btnPlay.querySelector('.icon-play');
  const iconPause = btnPlay.querySelector('.icon-pause');

  if (isPlaying) {
    iconPlay.style.display  = 'none';
    iconPause.style.display = '';
    vinyl.classList.add('spinning');
    eqBars.classList.add('active');
  } else {
    iconPlay.style.display  = '';
    iconPause.style.display = 'none';
    vinyl.classList.remove('spinning');
    eqBars.classList.remove('active');
  }
}

// ─── Audio Events ────────────────────────────────────
audio.addEventListener('play', () => {
  isPlaying = true;
  updatePlayUI();
  setStatus('');
});

audio.addEventListener('pause', () => {
  isPlaying = false;
  updatePlayUI();
});

audio.addEventListener('loadedmetadata', () => {
  totalTimeEl.textContent = formatTime(audio.duration);
  const durEl = document.getElementById(`dur-${currentIndex}`);
  if (durEl) durEl.textContent = formatTime(audio.duration);
  setStatus('');
});

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width  = pct + '%';
  progressThumb.style.left  = pct + '%';
  currentTimeEl.textContent = formatTime(audio.currentTime);
});

audio.addEventListener('ended', () => {
  isPlaying = false;
  updatePlayUI();

  if (isRepeat) {
    audio.currentTime = 0;
    audio.play();
    return;
  }

  let next;
  if (isShuffle) {
    do { next = Math.floor(Math.random() * tracks.length); }
    while (next === currentIndex && tracks.length > 1);
  } else {
    next = (currentIndex + 1) % tracks.length;
  }
  loadTrack(next, true);
});

audio.addEventListener('error', () => {
  const codes = { 1: 'Aborted', 2: 'Network error', 3: 'Decode error', 4: 'File not found / unsupported format' };
  const msg = codes[audio.error?.code] || 'Unknown error';
  setStatus('Error: ' + msg + ' — make sure the MP3 file is in the same folder.', true);
  isPlaying = false;
  updatePlayUI();
});

audio.addEventListener('waiting', () => setStatus('Buffering...'));
audio.addEventListener('canplay', () => setStatus(''));

// ─── Seek ─────────────────────────────────────────────
function seekTo(e) {
  if (!audio.duration) return;
  const rect = progressBar.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.currentTime = pct * audio.duration;
}

progressBar.addEventListener('click', seekTo);

let isDragging = false;
progressBar.addEventListener('mousedown', e => { isDragging = true; seekTo(e); });
document.addEventListener('mousemove',   e => { if (isDragging) seekTo(e); });
document.addEventListener('mouseup',     ()  => { isDragging = false; });

// ─── Prev / Next ─────────────────────────────────────
btnPrev.addEventListener('click', () => {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
  } else {
    const prev = (currentIndex - 1 + tracks.length) % tracks.length;
    loadTrack(prev, isPlaying);
  }
});

btnNext.addEventListener('click', () => {
  const next = isShuffle
    ? Math.floor(Math.random() * tracks.length)
    : (currentIndex + 1) % tracks.length;
  loadTrack(next, isPlaying);
});

// ─── Play Button ─────────────────────────────────────
btnPlay.addEventListener('click', togglePlay);

// ─── Shuffle / Repeat ────────────────────────────────
btnShuffle.addEventListener('click', () => {
  isShuffle = !isShuffle;
  btnShuffle.classList.toggle('active', isShuffle);
});

btnRepeat.addEventListener('click', () => {
  isRepeat = !isRepeat;
  btnRepeat.classList.toggle('active', isRepeat);
});

// ─── Volume ───────────────────────────────────────────
audio.volume = 0.75;

function updateVolSliderStyle() {
  const pct = volSlider.value + '%';
  volSlider.style.background =
    `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}, var(--border) ${pct}, var(--border) 100%)`;
}

volSlider.addEventListener('input', () => {
  audio.volume = parseInt(volSlider.value) / 100;
  volLabel.textContent = volSlider.value;
  updateVolSliderStyle();
});

updateVolSliderStyle();

// ─── Keyboard Shortcuts ──────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.code) {
    case 'Space':       e.preventDefault(); togglePlay(); break;
    case 'ArrowRight':  audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); break;
    case 'ArrowLeft':   audio.currentTime = Math.max(0, audio.currentTime - 10); break;
    case 'ArrowUp':
      volSlider.value = Math.min(100, parseInt(volSlider.value) + 5);
      volSlider.dispatchEvent(new Event('input'));
      break;
    case 'ArrowDown':
      volSlider.value = Math.max(0, parseInt(volSlider.value) - 5);
      volSlider.dispatchEvent(new Event('input'));
      break;
  }
});

// ─── Init ─────────────────────────────────────────────
loadTrack(0, false);
