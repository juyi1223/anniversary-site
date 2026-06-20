const readyButton = document.querySelector("#readyButton");

readyButton.addEventListener("click", async () => {
  readyButton.disabled = true;
  readyButton.classList.add("starting");

  try {
    const audio = new Audio("assets/home-music.mp3");
    audio.loop = true;
    await audio.play();
    localStorage.setItem(
      "yixin.globalMusic",
      JSON.stringify({ isPlaying: true, currentTime: audio.currentTime || 0 }),
    );
  } catch {
    localStorage.setItem("yixin.globalMusic", JSON.stringify({ isPlaying: true, currentTime: 0 }));
  }

  window.location.href = "home.html";
});
