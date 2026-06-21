const musicTracks = [
  { id: "us", title: "我们俩", src: "assets/home-music.mp3" },
  { id: "city-love", title: "大城小爱", src: "assets/city-love.flac" },
];
const defaultMusicTrackId = "us";
const globalMusicKey = "yixin.globalMusic";

const readyButton = document.querySelector("#readyButton");
const startScreen = document.querySelector("#startScreen");
const frameShell = document.querySelector("#siteFrameShell");
const siteFrame = document.querySelector("#siteFrame");
const audio = document.querySelector("#startMusic");
const musicToggle = document.querySelector("#startMusicToggle");
const musicPause = document.querySelector("#startMusicPause");

const saved = readMusicState();
let activeTrackId = canUseMusicTrack(saved.trackId) ? getMusicTrack(saved.trackId).id : defaultMusicTrackId;
let pendingRestoreTime = saved.times?.[activeTrackId] ?? saved.currentTime ?? 0;

loadTrack(activeTrackId, pendingRestoreTime);

readyButton.addEventListener("click", async () => {
  readyButton.disabled = true;
  readyButton.classList.add("starting");
  await playMusic();
  persistMusicState();
  startScreen.hidden = true;
  frameShell.hidden = false;
  siteFrame.src = "home.html";
});

musicToggle.addEventListener("click", async () => {
  await switchTrack(getNextMusicTrackId(activeTrackId, saved.cityLoveUnlocked), { autoplay: true });
});

musicPause.addEventListener("click", async () => {
  if (audio.paused) {
    await playMusic();
  } else {
    audio.pause();
    updateMusicButton(false);
  }
  persistMusicState();
});

audio.addEventListener("loadedmetadata", () => {
  if (pendingRestoreTime && Number.isFinite(pendingRestoreTime)) {
    audio.currentTime = Math.min(pendingRestoreTime, Math.max(audio.duration - 1, 0));
  }
  pendingRestoreTime = 0;
});
audio.addEventListener("ended", async () => {
  audio.currentTime = 0;
  await playMusic();
});
audio.addEventListener("timeupdate", persistMusicState);
audio.addEventListener("play", () => updateMusicButton(true));
audio.addEventListener("pause", () => updateMusicButton(false));
window.addEventListener("pagehide", persistMusicState);
window.addEventListener("message", (event) => {
  if (event.data?.type !== "yixin:switchMusic") return;
  const { trackId, unlockCityLove } = event.data.detail || {};
  if (unlockCityLove) saved.cityLoveUnlocked = true;
  if (trackId) switchTrack(trackId, { autoplay: true });
});

async function playMusic() {
  try {
    await audio.play();
    updateMusicButton(true);
  } catch {
    updateMusicButton(false);
  }
}

function loadTrack(trackId, currentTime = 0) {
  const track = getMusicTrack(canUseMusicTrack(trackId) ? trackId : defaultMusicTrackId);
  activeTrackId = track.id;
  audio.src = track.src;
  pendingRestoreTime = currentTime || 0;
  updateMusicButton(!audio.paused);
}

async function switchTrack(trackId, { autoplay = false } = {}) {
  saved.times = { ...(saved.times || {}), [activeTrackId]: audio.currentTime || 0 };
  saved.trackId = canUseMusicTrack(trackId) ? getMusicTrack(trackId).id : defaultMusicTrackId;
  loadTrack(saved.trackId, saved.times?.[saved.trackId] || 0);
  audio.load();
  persistMusicState();
  if (autoplay) await playMusic();
}

function updateMusicButton(isPlaying) {
  musicToggle.querySelector(".music-text").textContent = `爱の小曲：${getMusicTrack(activeTrackId).title}`;
  musicPause.querySelector(".music-icon").textContent = isPlaying ? "Ⅱ" : "♪";
  document.querySelectorAll(".music-toggle").forEach((button) => button.classList.toggle("playing", isPlaying));
}

function persistMusicState() {
  saved.trackId = activeTrackId;
  saved.isPlaying = !audio.paused;
  saved.currentTime = audio.currentTime || 0;
  saved.times = { ...(saved.times || {}), [activeTrackId]: audio.currentTime || 0 };
  saved.cityLoveUnlocked = Boolean(saved.cityLoveUnlocked);
  localStorage.setItem(globalMusicKey, JSON.stringify(saved));
}

function readMusicState() {
  try {
    return JSON.parse(localStorage.getItem(globalMusicKey)) || {};
  } catch {
    return {};
  }
}

function canUseMusicTrack(trackId) {
  return trackId === defaultMusicTrackId || Boolean(saved.cityLoveUnlocked);
}

function getMusicTrack(trackId) {
  return musicTracks.find((track) => track.id === trackId) || musicTracks[0];
}

function getNextMusicTrackId(trackId, isCityLoveUnlocked = true) {
  if (!isCityLoveUnlocked) return defaultMusicTrackId;
  const currentIndex = musicTracks.findIndex((track) => track.id === trackId);
  return musicTracks[(currentIndex + 1 + musicTracks.length) % musicTracks.length].id;
}
