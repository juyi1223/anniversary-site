const YiXinStore = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};

const preferenceKey = "yixin.preferences";
const draftPrefix = "yixin.draft.";
const globalMusicKey = "yixin.globalMusic";
const editorSessionKey = "yixin.currentEditor";
const editorPasswords = {
  "神": "031223",
  "祖心": "040818",
};
const musicTracks = [
  { id: "us", title: "我们俩", src: "assets/home-music.mp3" },
  { id: "city-love", title: "大城小爱", src: "assets/city-love.mp3" },
];
const defaultMusicTrackId = "us";
const isMobileLike = window.matchMedia("(max-width: 860px), (pointer: coarse)").matches;
const thousandDayEggSeenKey = "yixin.thousandDayEgg.seen";
const thousandDayEntryKey = "yixin.thousandDayEntry.created";
const thousandDayDate = "2026-06-26";
const thousandDayTitle = "我们的第1000天";
const thousandDayLetter =
  "亲爱的心，今天是我们在一起的第86400000秒，也就是第1000天，不知不觉我们已经在一起这么久了。在这1000天里，我们一起努力度过了许许多多的难关，也一起去了许多地方旅行，吃了无数顿美食，但我认为这些还不够，未来我希望与你有更多的经历。这个网站是我送给你独一无二的礼物，不仅仅是为了纪念我们的1000天，未来我会不断完善它，让它成为承载我们美好回忆的地方。";
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function shouldTriggerThousandDayEgg({ totalDays, isEdit, editorName, hasSeen }) {
  return totalDays >= 1000 && isEdit && editorName === "祖心" && !hasSeen;
}

function isThousandDayPreviewLogin(name, password) {
  return name === "神" && password === "1000";
}

function isCityLovePreviewLogin(name, password) {
  return name === "神" && password === "dcxa";
}

function shouldTriggerMusicEgg({ trackId, playCount, hasPrompted }) {
  return trackId === "us" && playCount >= 3 && !hasPrompted;
}

function isCityLoveAnswer(answer = "") {
  return answer.trim() === "大城小爱";
}

function getMusicTrack(trackId) {
  return musicTracks.find((track) => track.id === trackId) || musicTracks[0];
}

function getNextMusicTrackId(trackId, isCityLoveUnlocked = true) {
  if (!isCityLoveUnlocked) return defaultMusicTrackId;
  const currentIndex = musicTracks.findIndex((track) => track.id === trackId);
  return musicTracks[(currentIndex + 1 + musicTracks.length) % musicTracks.length].id;
}

function buildSwitchMusicDetail(trackId) {
  return { trackId, unlockCityLove: trackId === "city-love" };
}

function canSeeThousandDayCaption({ isEdit, editorName }) {
  return isEdit && editorName === "祖心";
}

function getThousandDayCaption({ isEdit, editorName }) {
  return canSeeThousandDayCaption({ isEdit, editorName }) ? `神：${thousandDayLetter}` : "";
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, data: reader.result });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readFiles(input) {
  return Promise.all(Array.from(input?.files || []).map(readFileAsDataUrl));
}

async function prepareFiles(input, section) {
  const hasFiles = Boolean(input?.files?.length);
  if (window.YiXinCloud?.isEnabled()) {
    const uploaded = await window.YiXinCloud.uploadFiles(section, input.files);
    if (uploaded?.length) return uploaded;
    if (hasFiles) {
      const detail = window.YiXinCloud.getLastError?.();
      throw new Error(`照片上传到云端失败：${detail || "请检查网络和 Supabase Storage 权限。"}`);
    }
  }
  return hasFiles ? readFiles(input) : [];
}

async function loadSharedContent(key, fallback) {
  const localValue = YiXinStore.get(key, fallback);
  if (!window.YiXinCloud?.isEnabled()) return localValue;
  const cloudValue = await Promise.race([
    window.YiXinCloud.loadContent(key, localValue),
    new Promise((resolve) => setTimeout(() => resolve(localValue), 2500)),
  ]);
  YiXinStore.set(key, cloudValue);
  return cloudValue;
}

async function saveSharedContent(key, value) {
  YiXinStore.set(key, value);
  if (window.YiXinCloud?.isEnabled()) {
    const saved = await window.YiXinCloud.saveContent(key, value);
    if (!saved) {
      const detail = window.YiXinCloud.getLastError?.();
      throw new Error(`内容没有同步到云端：${detail || "请检查网络和 Supabase 数据表权限。"}`);
    }
  }
}

function renderPhotos(photos = []) {
  if (!photos.length) return "";
  return `<div class="photo-grid">${photos
    .map((photo) => `<img src="${photo.data}" alt="${photo.name || "鐓х墖"}" />`)
    .join("")}</div>`;
}

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCurrentEditorName() {
  return sessionStorage.getItem(editorSessionKey) || "";
}

function setCurrentEditorName(name) {
  sessionStorage.setItem(editorSessionKey, name);
}

function getPreferences() {
  const preferences = YiXinStore.get(preferenceKey, {
    contentMode: "view",
    deviceMode: "desktop",
  });
  preferences.deviceMode = "desktop";
  if (preferences.contentMode === "edit" && !getCurrentEditorName()) {
    preferences.contentMode = "view";
  }
  return preferences;
}

function setPreferences(nextPreferences) {
  YiXinStore.set(preferenceKey, { ...getPreferences(), ...nextPreferences });
  applyPreferences();
}

function isEditMode() {
  return getPreferences().contentMode === "edit";
}

function applyPreferences() {
  const preferences = getPreferences();
  document.body.classList.toggle("view-mode", preferences.contentMode === "view");
  document.body.classList.toggle("edit-mode", preferences.contentMode === "edit");
  document.body.classList.remove("mobile-preview");
  document.body.classList.add("desktop-preview");

  document.querySelectorAll(".mode-button").forEach((button) => {
    const active = button.dataset.contentMode === preferences.contentMode;
    button.classList.toggle("active", active);
  });

  if (preferences.contentMode === "view") {
    document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
  }
}

function mountModeSwitcher() {
  const switcher = document.createElement("aside");
  switcher.className = "mode-switcher";
  switcher.setAttribute("aria-label", "网站模式切换");
  switcher.innerHTML = `
    <div class="mode-group" aria-label="内容模式">
      <button class="mode-button" type="button" data-content-mode="edit">编辑</button>
      <button class="mode-button" type="button" data-content-mode="view">观看</button>
    </div>
  `;

  switcher.addEventListener("click", (event) => {
    const button = event.target.closest(".mode-button");
    if (!button) return;
    if (button.dataset.contentMode === "edit") {
      openEditorLogin();
      return;
    }
    if (button.dataset.contentMode === "view") {
      setPreferences({ contentMode: "view", deviceMode: "desktop" });
    }
  });

  document.body.appendChild(switcher);
  applyPreferences();
}

function openEditorLogin() {
  let dialog = document.querySelector("#editorLoginDialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.className = "editor-dialog";
    dialog.id = "editorLoginDialog";
    dialog.innerHTML = `
      <form method="dialog" class="editor-form" id="editorLoginForm">
        <header>
          <h2>进入编辑模式</h2>
          <button class="icon-button" type="button" value="cancel" aria-label="关闭">x</button>
        </header>
        <label>
          编辑人
          <select id="editorName">
            <option value="神">神</option>
            <option value="祖心">祖心</option>
          </select>
        </label>
        <label>
          密码
          <input type="password" id="editorPassword" autocomplete="current-password" required />
        </label>
        <p class="login-error" id="editorLoginError"></p>
        <div class="form-actions">
          <span></span>
          <button class="primary-button" value="default">确认</button>
        </div>
      </form>
    `;
    document.body.appendChild(dialog);
    dialog.querySelector("#editorLoginForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const name = dialog.querySelector("#editorName").value;
      const password = dialog.querySelector("#editorPassword").value;
      const error = dialog.querySelector("#editorLoginError");
      if (isThousandDayPreviewLogin(name, password)) {
        error.textContent = "";
        dialog.close();
        showThousandDayEgg({ preview: true });
        return;
      }
      if (isCityLovePreviewLogin(name, password)) {
        error.textContent = "";
        dialog.close();
        showCityLoveEgg();
        return;
      }
      if (name === "神" && password === "12345") {
        error.textContent = "";
        dialog.close();
        showProposalSecret();
        return;
      }
      if (editorPasswords[name] !== password) {
        error.textContent = "密码不正确";
        return;
      }
      error.textContent = "";
      setCurrentEditorName(name);
      setPreferences({ contentMode: "edit", deviceMode: "desktop" });
      dialog.close();
    });
  }
  dialog.querySelector("#editorPassword").value = "";
  dialog.querySelector("#editorLoginError").textContent = "";
  dialog.showModal();
}

function showProposalSecret() {
  let page = document.querySelector("#proposalSecretPage");
  if (!page) {
    page = document.createElement("section");
    page.id = "proposalSecretPage";
    page.className = "proposal-secret-page";
    page.innerHTML = `
      <button class="proposal-close" type="button" aria-label="鍏抽棴">脳</button>
      <h1>灏辨槸鐜板湪锛屾垜浠粨濠氬惂锛?/h1>
    `;
    document.body.appendChild(page);
    page.querySelector(".proposal-close").addEventListener("click", () => page.remove());
  }
}

function showThousandDayEgg({ preview = false, onClose } = {}) {
  document.querySelector("#thousandDayEgg")?.remove();
  const page = document.createElement("section");
  page.id = "thousandDayEgg";
  page.className = "thousand-day-egg";
  page.setAttribute("role", "dialog");
  page.setAttribute("aria-modal", "true");
  page.innerHTML = `
    <div class="gold-confetti" aria-hidden="true"></div>
    <article class="thousand-day-letter">
      <button class="proposal-close thousand-day-close" type="button" aria-label="关闭">x</button>
      <p class="eyebrow">${preview ? "Preview" : "1000 Days"}</p>
      <h2>神写给心的信</h2>
      <p>${escapeHtml(thousandDayLetter)}</p>
    </article>
  `;

  const confetti = page.querySelector(".gold-confetti");
  for (let index = 0; index < 70; index += 1) {
    const ribbon = document.createElement("span");
    ribbon.className = "gold-ribbon";
    ribbon.style.left = `${Math.random() * 100}%`;
    ribbon.style.animationDelay = `${Math.random() * 2.4}s`;
    ribbon.style.animationDuration = `${4.8 + Math.random() * 3.2}s`;
    ribbon.style.setProperty("--spin", `${180 + Math.random() * 540}deg`);
    ribbon.style.setProperty("--drift", `${-60 + Math.random() * 120}px`);
    confetti.appendChild(ribbon);
  }

  page.querySelector(".thousand-day-close").addEventListener("click", () => {
    page.remove();
    onClose?.();
  });
  document.body.appendChild(page);
}

function showCityLoveEgg({ onSwitch } = {}) {
  document.querySelector("#cityLoveEgg")?.remove();
  const dialog = document.createElement("dialog");
  dialog.id = "cityLoveEgg";
  dialog.className = "editor-dialog music-egg-dialog";
  dialog.innerHTML = `
    <form method="dialog" class="editor-form music-egg-form">
      <header>
        <h2>已经听了三遍</h2>
        <button class="icon-button" type="button" value="cancel" aria-label="关闭">x</button>
      </header>
      <p>我们俩是不是听腻了，想不想换首歌？</p>
      <div class="music-egg-actions">
        <button class="ghost-button" type="button" data-keep-music>不想</button>
        <button class="primary-button" type="button" data-want-music>想</button>
      </div>
      <section class="music-egg-question" hidden>
        <label>
          神和心是在南京这个大城市认识，经营着他们之间小小的恋爱，所以这是什么？
          <input id="cityLoveAnswer" type="text" autocomplete="off" />
        </label>
        <p class="login-error" id="cityLoveError"></p>
        <div class="form-actions">
          <span></span>
          <button class="primary-button" type="button" data-submit-city-love>确认</button>
        </div>
      </section>
    </form>
  `;

  document.body.appendChild(dialog);
  const question = dialog.querySelector(".music-egg-question");
  const answerInput = dialog.querySelector("#cityLoveAnswer");
  const error = dialog.querySelector("#cityLoveError");

  dialog.querySelector("[data-keep-music]").addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-want-music]").addEventListener("click", () => {
    question.hidden = false;
    answerInput.focus();
  });
  dialog.querySelector("[data-submit-city-love]").addEventListener("click", () => {
    if (!isCityLoveAnswer(answerInput.value)) {
      error.textContent = "再想想，是四个字的歌名哦";
      return;
    }
    error.textContent = "";
    dialog.close();
    if (onSwitch) onSwitch();
    else requestMusicSwitch("city-love");
  });
  answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      dialog.querySelector("[data-submit-city-love]").click();
    }
  });
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.showModal();
}

function requestMusicSwitch(trackId) {
  const detail = buildSwitchMusicDetail(trackId);
  window.dispatchEvent(new CustomEvent("yixin:switchMusic", { detail }));
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "yixin:switchMusic", detail }, "*");
  }
}

function markThousandDayEggSeen() {
  YiXinStore.set(thousandDayEggSeenKey, true);
}

function hasSeenThousandDayEgg() {
  return YiXinStore.get(thousandDayEggSeenKey, false);
}

function mountDialogCloseFix() {
  document.addEventListener("click", (event) => {
    const closeButton = event.target.closest('[value="cancel"], .dialog-close');
    if (!closeButton) return;
    const dialog = closeButton.closest("dialog");
    if (!dialog) return;
    event.preventDefault();
    dialog.close();
  });
}

async function saveDraft(name, form, extra = {}) {
  const fields = {};
  const files = {};
  const controls = form.querySelectorAll("input, textarea, select");

  for (const control of controls) {
    if (!control.id) continue;
    if (control.type === "file") {
      const selectedFiles = await readFiles(control);
      if (selectedFiles.length) files[control.id] = selectedFiles;
    } else {
      fields[control.id] = control.value;
    }
  }

  YiXinStore.set(`${draftPrefix}${name}`, {
    savedAt: new Date().toISOString(),
    fields,
    files,
    extra,
  });
  showDraftNotice(form, "草稿已保存");
}

function getDraft(name) {
  return YiXinStore.get(`${draftPrefix}${name}`, null);
}

function clearDraft(name) {
  YiXinStore.remove(`${draftPrefix}${name}`);
}

function restoreDraft(name, form) {
  const draft = getDraft(name);
  if (!draft) return null;
  Object.entries(draft.fields || {}).forEach(([id, value]) => {
    const control = form.querySelector(`#${id}`);
    if (control && control.type !== "file") control.value = value;
  });
  showDraftNotice(form, "已恢复草稿");
  return draft;
}

function showDraftNotice(form, message) {
  let notice = form.querySelector(".draft-notice");
  if (!notice) {
    notice = document.createElement("p");
    notice.className = "draft-notice";
    form.querySelector(".form-actions")?.before(notice);
  }
  notice.textContent = message;
}

function mountGlobalMusic() {
  if (window.self !== window.top) return;
  const audio = document.createElement("audio");
  audio.id = "globalMusic";
  audio.loop = false;
  audio.preload = "metadata";

  const controls = document.createElement("div");
  controls.className = "music-controls";
  controls.innerHTML = `
    <button class="music-toggle music-track-button" type="button" aria-label="切换背景音乐">
      <span class="music-icon">♪</span><span class="music-text">爱の小曲</span>
    </button>
    <button class="music-toggle music-pause-button" type="button" aria-label="暂停背景音乐">
      <span class="music-icon">♪</span>
    </button>
  `;
  document.body.append(audio, controls);

  const trackButton = controls.querySelector(".music-track-button");
  const pauseButton = controls.querySelector(".music-pause-button");
  const saved = YiXinStore.get(globalMusicKey, {
    isPlaying: false,
    trackId: defaultMusicTrackId,
    currentTime: 0,
    times: {},
    usPlayCount: 0,
    cityLovePrompted: false,
    cityLoveUnlocked: false,
  });
  let activeTrackId = canUseMusicTrack(saved.trackId) ? getMusicTrack(saved.trackId).id : defaultMusicTrackId;
  let shouldRestoreTime = true;
  let pendingRestoreTime = 0;

  loadTrack(activeTrackId, saved.times?.[activeTrackId] ?? saved.currentTime ?? 0);

  audio.addEventListener("loadedmetadata", () => {
    const restoreTime = shouldRestoreTime ? pendingRestoreTime : 0;
    shouldRestoreTime = false;
    if (restoreTime && Number.isFinite(restoreTime)) {
      audio.currentTime = Math.min(restoreTime, Math.max(audio.duration - 1, 0));
    }
    if (saved.isPlaying) audio.play().then(() => updateMusicButton(true)).catch(() => updateMusicButton(false));
  });

  trackButton.addEventListener("click", async () => {
    await switchTrack(getNextMusicTrackId(activeTrackId, saved.cityLoveUnlocked), { autoplay: true });
  });

  pauseButton.addEventListener("click", async () => {
    if (audio.paused) {
      try {
        await audio.play();
        updateMusicButton(true);
      } catch {
        updateMusicButton(false);
      }
    } else {
      audio.pause();
      updateMusicButton(false);
    }
    persistMusicState();
  });

  window.addEventListener("yixin:switchMusic", (event) => {
    const trackId = event.detail?.trackId;
    if (event.detail?.unlockCityLove) saved.cityLoveUnlocked = true;
    if (trackId) switchTrack(trackId, { autoplay: true });
  });

  audio.addEventListener("ended", async () => {
    if (activeTrackId === "us") {
      saved.usPlayCount = (saved.usPlayCount || 0) + 1;
      persistMusicState();
      if (shouldTriggerMusicEgg({
        trackId: activeTrackId,
        playCount: saved.usPlayCount,
        hasPrompted: saved.cityLovePrompted,
      })) {
        saved.cityLovePrompted = true;
        persistMusicState();
        showCityLoveEgg({
          onSwitch: () => unlockCityLoveAndSwitch(),
        });
        await audio.play().catch(() => updateMusicButton(false));
        return;
      }
    }
    audio.currentTime = 0;
    await audio.play().catch(() => updateMusicButton(false));
  });

  audio.addEventListener("timeupdate", persistMusicState);
  audio.addEventListener("pause", () => {
    if (!document.hidden) persistMusicState();
  });
  audio.addEventListener("play", persistMusicState);
  window.addEventListener("pagehide", () => {
    persistMusicState();
  });
  updateMusicButton(saved.isPlaying);

  function loadTrack(trackId, currentTime = 0) {
    const track = getMusicTrack(canUseMusicTrack(trackId) ? trackId : defaultMusicTrackId);
    activeTrackId = track.id;
    audio.src = track.src;
    audio.dataset.trackId = track.id;
    shouldRestoreTime = true;
    pendingRestoreTime = currentTime || 0;
    saved.times = { ...(saved.times || {}), [track.id]: currentTime || 0 };
    updateMusicButton(!audio.paused);
  }

  async function switchTrack(trackId, { autoplay = false } = {}) {
    saved.times = { ...(saved.times || {}), [activeTrackId]: audio.currentTime || 0 };
    saved.trackId = canUseMusicTrack(trackId) ? getMusicTrack(trackId).id : defaultMusicTrackId;
    loadTrack(saved.trackId, saved.times?.[saved.trackId] || 0);
    audio.load();
    persistMusicState();
    if (!autoplay) return;
    try {
      await audio.play();
      updateMusicButton(true);
    } catch {
      updateMusicButton(false);
    }
  }

  function canUseMusicTrack(trackId) {
    const track = getMusicTrack(trackId);
    if (track.heavy && isMobileLike) return false;
    return trackId === defaultMusicTrackId || Boolean(saved.cityLoveUnlocked);
  }

  function unlockCityLoveAndSwitch() {
    saved.cityLoveUnlocked = true;
    switchTrack("city-love", { autoplay: true });
  }

  function updateMusicButton(isPlaying) {
    const track = getMusicTrack(activeTrackId);
    trackButton.querySelector(".music-text").textContent = `爱の小曲：${track.title}`;
    pauseButton.querySelector(".music-icon").textContent = isPlaying ? "Ⅱ" : "♪";
    controls.querySelectorAll(".music-toggle").forEach((button) => button.classList.toggle("playing", isPlaying));
  }

  function persistMusicState() {
    saved.trackId = activeTrackId;
    saved.isPlaying = !audio.paused;
    saved.currentTime = audio.currentTime || 0;
    saved.times = { ...(saved.times || {}), [activeTrackId]: audio.currentTime || 0 };
    YiXinStore.set(globalMusicKey, {
      isPlaying: saved.isPlaying,
      trackId: saved.trackId,
      currentTime: saved.currentTime,
      times: saved.times,
      usPlayCount: saved.usPlayCount || 0,
      cityLovePrompted: Boolean(saved.cityLovePrompted),
      cityLoveUnlocked: Boolean(saved.cityLoveUnlocked),
    });
    updateMusicButton(!audio.paused);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  mountModeSwitcher();
  mountDialogCloseFix();
  mountGlobalMusic();
});


