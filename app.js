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
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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
    await window.YiXinCloud.saveContent(key, value);
  }
}

function renderPhotos(photos = []) {
  if (!photos.length) return "";
  return `<div class="photo-grid">${photos
    .map((photo) => `<img src="${photo.data}" alt="${photo.name || "照片"}" />`)
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
  document.body.classList.toggle("mobile-preview", preferences.deviceMode === "mobile");
  document.body.classList.toggle("desktop-preview", preferences.deviceMode === "desktop");

  document.querySelectorAll(".mode-button").forEach((button) => {
    const active =
      button.dataset.contentMode === preferences.contentMode ||
      button.dataset.deviceMode === preferences.deviceMode;
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
    <div class="mode-group" aria-label="设备模式">
      <button class="mode-button" type="button" data-device-mode="desktop">电脑</button>
      <button class="mode-button" type="button" data-device-mode="mobile">手机</button>
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
      setPreferences({ contentMode: "view" });
      return;
    }
    if (button.dataset.deviceMode) setPreferences({ deviceMode: button.dataset.deviceMode });
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
          <button class="icon-button" type="button" value="cancel" aria-label="关闭">×</button>
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
      setPreferences({ contentMode: "edit" });
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
      <button class="proposal-close" type="button" aria-label="关闭">×</button>
      <h1>就是现在，我们结婚吧！</h1>
    `;
    document.body.appendChild(page);
    page.querySelector(".proposal-close").addEventListener("click", () => page.remove());
  }
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
  const audio = document.createElement("audio");
  audio.id = "globalMusic";
  audio.src = "assets/home-music.mp3";
  audio.loop = true;
  audio.preload = "auto";

  const button = document.createElement("button");
  button.className = "music-toggle";
  button.type = "button";
  button.setAttribute("aria-label", "播放或暂停背景音乐");
  button.innerHTML = `<span class="music-icon">♪</span><span class="music-text">播放音乐</span>`;
  document.body.append(audio, button);

  const saved = YiXinStore.get(globalMusicKey, { isPlaying: false, currentTime: 0 });
  audio.addEventListener("loadedmetadata", () => {
    if (saved.currentTime && Number.isFinite(saved.currentTime)) {
      audio.currentTime = Math.min(saved.currentTime, Math.max(audio.duration - 1, 0));
    }
    if (saved.isPlaying) audio.play().then(() => updateMusicButton(true)).catch(() => updateMusicButton(false));
  });

  button.addEventListener("click", async () => {
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

  audio.addEventListener("timeupdate", persistMusicState);
  audio.addEventListener("pause", persistMusicState);
  audio.addEventListener("play", persistMusicState);
  window.addEventListener("pagehide", persistMusicState);
  updateMusicButton(saved.isPlaying);

  function updateMusicButton(isPlaying) {
    button.querySelector(".music-text").textContent = isPlaying ? "暂停音乐" : "播放音乐";
    button.querySelector(".music-icon").textContent = isPlaying ? "Ⅱ" : "♪";
    button.classList.toggle("playing", isPlaying);
  }

  function persistMusicState() {
    YiXinStore.set(globalMusicKey, {
      isPlaying: !audio.paused,
      currentTime: audio.currentTime || 0,
    });
    updateMusicButton(!audio.paused);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  mountModeSwitcher();
  mountDialogCloseFix();
  mountGlobalMusic();
});
