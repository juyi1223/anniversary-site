const readyButton = document.querySelector("#readyButton");
const startScreen = document.querySelector("#startScreen");
const frameShell = document.querySelector("#siteFrameShell");
const siteFrame = document.querySelector("#siteFrame");
const audio = document.querySelector("#startMusic");
const musicToggle = document.querySelector("#startMusicToggle");
const musicIcon = musicToggle.querySelector(".music-icon");

readyButton.addEventListener("click", async () => {
  readyButton.disabled = true;
  readyButton.classList.add("starting");
  await playMusic();
  startScreen.hidden = true;
  frameShell.hidden = false;
  siteFrame.src = "home.html";
});

musicToggle.addEventListener("click", async () => {
  if (audio.paused) {
    await playMusic();
  } else {
    audio.pause();
    updateMusicButton(false);
  }
});

audio.addEventListener("play", () => updateMusicButton(true));
audio.addEventListener("pause", () => updateMusicButton(false));

async function playMusic() {
  try {
    await audio.play();
    updateMusicButton(true);
  } catch {
    updateMusicButton(false);
  }
}

function updateMusicButton(isPlaying) {
  musicIcon.textContent = isPlaying ? "Ⅱ" : "♪";
  musicToggle.classList.toggle("playing", isPlaying);
}
