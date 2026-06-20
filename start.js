const readyButton = document.querySelector("#readyButton");
const hint = document.querySelector("#startMusicHint");
let startAudio = null;

readyButton.addEventListener("click", async () => {
  readyButton.disabled = true;
  readyButton.classList.add("starting");

  try {
    startAudio = new Audio("assets/home-music.mp3");
    startAudio.loop = true;
    await startAudio.play();
    localStorage.setItem(
      "yixin.globalMusic",
      JSON.stringify({ isPlaying: true, currentTime: startAudio.currentTime || 0 }),
    );
  } catch {
    localStorage.setItem("yixin.globalMusic", JSON.stringify({ isPlaying: true, currentTime: 0 }));
  }

  if (hint) hint.hidden = false;
  setTimeout(() => {
    if (startAudio) {
      localStorage.setItem(
        "yixin.globalMusic",
        JSON.stringify({ isPlaying: true, currentTime: startAudio.currentTime || 0 }),
      );
    }
    window.location.href = "home.html";
  }, 900);
});
