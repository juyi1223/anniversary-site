const togetherAt = new Date(2023, 8, 30, 16, 18, 0);
const timerModeKey = "yixin.timerMode";
const heartLayer = document.querySelector("#heartLayer");
const timerToggle = document.querySelector("#timerToggle");
const loveTimer = document.querySelector("#loveTimer");
const dayCount = document.querySelector("#dayCount");
let timerMode = YiXinStore.get(timerModeKey, "detail");

timerToggle.addEventListener("click", () => {
  timerMode = timerMode === "detail" ? "days" : "detail";
  YiXinStore.set(timerModeKey, timerMode);
  applyTimerMode();
  updateLoveTimer();
});

function applyTimerMode() {
  const isDaysMode = timerMode === "days";
  loveTimer.hidden = isDaysMode;
  dayCount.hidden = !isDaysMode;
  loveTimer.classList.toggle("timer-hidden", isDaysMode);
  dayCount.classList.toggle("timer-hidden", !isDaysMode);
  timerToggle.textContent = isDaysMode ? "详细时间" : "总天数";
}

function updateLoveTimer() {
  const now = new Date();
  const parts = diffFrom(togetherAt, now);
  const totalDays = Math.floor((now - togetherAt) / 86400000);

  Object.entries(parts).forEach(([key, value]) => {
    const target = document.querySelector(`[data-time="${key}"]`);
    if (!target) return;
    const nextValue = String(value).padStart(2, "0");
    if (target.textContent !== nextValue) {
      target.textContent = nextValue;
      target.parentElement.classList.remove("flip-now");
      window.requestAnimationFrame(() => target.parentElement.classList.add("flip-now"));
    }
  });

  const totalDaysTarget = document.querySelector('[data-time="totalDays"]');
  const nextDays = String(totalDays);
  if (totalDaysTarget.textContent !== nextDays) {
    totalDaysTarget.textContent = nextDays;
    dayCount.classList.remove("flip-now");
    window.requestAnimationFrame(() => dayCount.classList.add("flip-now"));
  }

  maybeShowThousandDayEgg(totalDays);
}

function maybeShowThousandDayEgg(totalDays) {
  if (
    !shouldTriggerThousandDayEgg({
      totalDays,
      isEdit: isEditMode(),
      editorName: getCurrentEditorName(),
      hasSeen: hasSeenThousandDayEgg(),
    })
  ) {
    return;
  }

  YiXinStore.set(thousandDayEntryKey, true);
  markThousandDayEggSeen();
  showThousandDayEgg();
}

function diffFrom(start, end) {
  let cursor = new Date(start);
  let years = end.getFullYear() - cursor.getFullYear();
  cursor.setFullYear(cursor.getFullYear() + years);
  if (cursor > end) {
    years -= 1;
    cursor = new Date(start);
    cursor.setFullYear(cursor.getFullYear() + years);
  }

  let months =
    (end.getFullYear() - cursor.getFullYear()) * 12 + end.getMonth() - cursor.getMonth();
  cursor.setMonth(cursor.getMonth() + months);
  if (cursor > end) {
    months -= 1;
    cursor.setMonth(cursor.getMonth() - 1);
  }

  let remaining = Math.max(0, end - cursor);
  const days = Math.floor(remaining / 86400000);
  remaining -= days * 86400000;
  const hours = Math.floor(remaining / 3600000);
  remaining -= hours * 3600000;
  const minutes = Math.floor(remaining / 60000);
  remaining -= minutes * 60000;
  const seconds = Math.floor(remaining / 1000);

  return { years, months, days, hours, minutes, seconds };
}

function spawnHeart() {
  const heart = document.createElement("span");
  heart.className = "falling-heart";
  heart.textContent = "♥";
  heart.style.left = `${Math.random() * 100}%`;
  heart.style.animationDuration = `${7 + Math.random() * 7}s`;
  heart.style.fontSize = `${12 + Math.random() * 18}px`;
  heart.style.opacity = `${0.3 + Math.random() * 0.45}`;
  heart.style.setProperty("--drift", `${-32 + Math.random() * 64}px`);
  heartLayer.appendChild(heart);
  heart.addEventListener("animationend", () => heart.remove());
}

applyTimerMode();
updateLoveTimer();
setInterval(updateLoveTimer, 1000);
setInterval(spawnHeart, 520);
for (let index = 0; index < 14; index += 1) {
  setTimeout(spawnHeart, index * 140);
}
