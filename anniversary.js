const anniversaryKey = "yixin.anniversaries";
const anniversaryDraftKey = "anniversary";

const locationOptions = {
  中国: ["北京市", "上海市", "浙江省", "江苏省", "广东省", "四川省", "福建省", "山东省", "湖北省", "湖南省", "云南省", "陕西省", "海南省", "香港特别行政区", "澳门特别行政区", "其他地区"],
  日本: ["东京都", "大阪府", "京都府", "北海道", "冲绳县", "其他地区"],
  韩国: ["首尔", "釜山", "济州", "仁川", "其他地区"],
  泰国: ["曼谷", "清迈", "普吉", "其他地区"],
  新加坡: ["新加坡"],
  美国: ["加利福尼亚州", "纽约州", "华盛顿州", "夏威夷州", "其他地区"],
  英国: ["英格兰", "苏格兰", "威尔士", "北爱尔兰"],
  法国: ["法兰西岛", "普罗旺斯", "其他地区"],
  其他国家: ["其他地区"],
};

const cityOptions = {
  北京市: ["东城区", "西城区", "朝阳区", "海淀区", "丰台区", "其他市区"],
  上海市: ["黄浦区", "徐汇区", "长宁区", "静安区", "浦东新区", "其他市区"],
  浙江省: ["杭州市", "宁波市", "温州市", "嘉兴市", "湖州市", "其他城市"],
  江苏省: ["南京市", "苏州市", "无锡市", "常州市", "扬州市", "其他城市"],
  广东省: ["广州市", "深圳市", "珠海市", "佛山市", "东莞市", "其他城市"],
  四川省: ["成都市", "绵阳市", "乐山市", "其他城市"],
  福建省: ["福州市", "厦门市", "泉州市", "其他城市"],
  山东省: ["济南市", "青岛市", "烟台市", "其他城市"],
  湖北省: ["武汉市", "宜昌市", "其他城市"],
  湖南省: ["长沙市", "岳阳市", "其他城市"],
  云南省: ["昆明市", "大理市", "丽江市", "其他城市"],
  陕西省: ["西安市", "咸阳市", "其他城市"],
  海南省: ["海口市", "三亚市", "其他城市"],
  香港特别行政区: ["香港岛", "九龙", "新界"],
  澳门特别行政区: ["澳门半岛", "氹仔", "路环"],
  东京都: ["新宿区", "涩谷区", "千代田区", "其他市区"],
  大阪府: ["大阪市", "堺市", "其他市区"],
  京都府: ["京都市", "其他市区"],
  首尔: ["江南区", "麻浦区", "中区", "其他市区"],
  曼谷: ["暹罗", "素坤逸", "其他市区"],
  新加坡: ["中区", "滨海湾", "圣淘沙", "其他地区"],
};

let anniversaries = [];
let currentDate = new Date();
let editingId = null;
let restoredAnniversaryDraft = null;

const calendarView = document.querySelector("#calendarView");
const anniversaryView = document.querySelector("#anniversaryView");
const fullDetail = document.querySelector("#anniversaryFullDetail");
const yearSelect = document.querySelector("#yearSelect");
const monthSelect = document.querySelector("#monthSelect");
const calendarGrid = document.querySelector("#calendarGrid");
const dialog = document.querySelector("#anniversaryDialog");
const form = document.querySelector("#anniversaryForm");
const deleteButton = document.querySelector("#deleteAnniversary");
const countrySelect = document.querySelector("#anniversaryCountry");
const provinceSelect = document.querySelector("#anniversaryProvince");
const citySelect = document.querySelector("#anniversaryCity");
const existingPhotoEditor = document.querySelector("#existingPhotoEditor");

document.querySelector("#prevMonth").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

document.querySelector("#nextMonth").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

document.querySelector("#addAnniversary").addEventListener("click", () => openEditor());
document.querySelector("#draftAnniversary").addEventListener("click", () => saveDraft(anniversaryDraftKey, form));

yearSelect.addEventListener("change", () => {
  currentDate.setFullYear(Number(yearSelect.value));
  renderCalendar();
});

monthSelect.addEventListener("change", () => {
  currentDate.setMonth(Number(monthSelect.value));
  renderCalendar();
});

countrySelect.addEventListener("change", () => renderProvinceOptions(countrySelect.value));
provinceSelect.addEventListener("change", () => renderCityOptions(provinceSelect.value));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const existing = anniversaries.find((item) => item.id === editingId);
  const newPhotos = await prepareFiles(document.querySelector("#anniversaryPhotos"), "anniversaries/photos");
  const draftFiles = restoredAnniversaryDraft?.files || {};
  const keptPhotos = (existing?.photos || []).filter((_, index) => {
    return !form.querySelector(`[data-delete-photo="${index}"]`)?.checked;
  });
  const entry = {
    id: editingId || uid(),
    date: document.querySelector("#anniversaryDate").value,
    title: document.querySelector("#anniversaryTitle").value.trim(),
    text: withEditorPrefix(document.querySelector("#anniversaryText").value.trim()),
    location: {
      country: countrySelect.value,
      province: provinceSelect.value,
      city: citySelect.value,
      address: document.querySelector("#anniversaryAddress").value.trim(),
    },
    photos: [...keptPhotos, ...(newPhotos.length ? newPhotos : draftFiles.anniversaryPhotos || [])],
  };

  anniversaries = editingId
    ? anniversaries.map((item) => (item.id === editingId ? entry : item))
    : [...anniversaries, entry];
  clearDraft(anniversaryDraftKey);
  restoredAnniversaryDraft = null;
  saveAndRender(entry.id);
  dialog.close();
});

deleteButton.addEventListener("click", () => {
  if (!editingId) return;
  anniversaries = anniversaries.filter((item) => item.id !== editingId);
  saveAndRender();
  showCalendarView();
  dialog.close();
});

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  renderDateSelectors(year, month);
  calendarGrid.innerHTML = "";

  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);
  const todayKey = toDateKey(new Date());

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateKey = toDateKey(date);
    const events = anniversaries.filter((item) => item.date === dateKey);
    const button = document.createElement("button");
    button.className = "day-cell";
    if (date.getMonth() !== month) button.classList.add("outside");
    if (dateKey === todayKey) button.classList.add("today");
    if (events.length) button.classList.add("has-event");
    button.innerHTML = `
      <span class="date-number">${date.getDate()}</span>
    `;
    button.addEventListener("click", () => {
      if (events[0]) showAnniversaryPage(events[0].id);
      else if (isEditMode()) openEditor({ date: dateKey });
    });
    calendarGrid.appendChild(button);
  }
}

function renderDateSelectors(year, month) {
  const years = new Set();
  const baseYear = new Date().getFullYear();
  for (let item = baseYear - 20; item <= baseYear + 20; item += 1) years.add(item);
  anniversaries.forEach((entry) => {
    if (entry.date) years.add(Number(entry.date.slice(0, 4)));
  });
  years.add(year);
  yearSelect.innerHTML = [...years].sort((a, b) => a - b).map((item) => `<option value="${item}">${item}年</option>`).join("");
  yearSelect.value = String(year);
  monthSelect.innerHTML = Array.from({ length: 12 }, (_, index) => `<option value="${index}">${index + 1}月</option>`).join("");
  monthSelect.value = String(month);
}

function showAnniversaryPage(id) {
  const entry = anniversaries.find((item) => item.id === id);
  if (!entry) return;
  calendarView.hidden = true;
  anniversaryView.hidden = false;
  fullDetail.innerHTML = `
    <div class="entry-hero">
      <div>
        <button class="back-link" type="button" id="backToCalendar">← 返回日历</button>
        <p class="entry-date">${formatDate(entry.date)}</p>
        <h2>${escapeHtml(entry.title)}</h2>
        ${renderLocation(entry.location)}
      </div>
      <div class="toolbar edit-only">
        <button class="ghost-button" id="clearText">删除配文</button>
        <button class="ghost-button" id="editCurrent">编辑</button>
      </div>
    </div>
    <p class="entry-text">${escapeHtml(entry.text || "还没有写下配文。")}</p>
    ${renderPhotoGallery(entry.photos)}
  `;
  document.querySelector("#backToCalendar").addEventListener("click", showCalendarView);
  document.querySelector("#editCurrent")?.addEventListener("click", () => openEditor(entry));
  document.querySelector("#clearText")?.addEventListener("click", () => updateEntry(id, { text: "" }));
  document.querySelectorAll("[data-remove-photo]").forEach((button) => {
    button.addEventListener("click", () => removePhoto(id, Number(button.dataset.removePhoto)));
  });
}

function showCalendarView() {
  anniversaryView.hidden = true;
  calendarView.hidden = false;
}

function renderPhotoGallery(photos = []) {
  if (!photos.length) return `<div class="empty-state compact-empty"><p>还没有上传照片。</p></div>`;
  return `<div class="photo-grid detail-photo-grid">${photos
    .map((photo, index) => {
      const src = photo.data || photo.url || "";
      return `
        <figure class="photo-item">
          <img src="${src}" alt="${photo.name || "照片"}" />
          <button class="photo-delete edit-only" type="button" data-remove-photo="${index}">删除照片</button>
        </figure>
      `;
    })
    .join("")}</div>`;
}

function updateEntry(id, patch) {
  anniversaries = anniversaries.map((item) => (item.id === id ? { ...item, ...patch } : item));
  saveAndRender(id);
}

function removePhoto(id, index) {
  const entry = anniversaries.find((item) => item.id === id);
  if (!entry) return;
  const photos = (entry.photos || []).filter((_, photoIndex) => photoIndex !== index);
  updateEntry(id, { photos });
}

function renderLocation(location = {}) {
  const parts = [location.country, location.province, location.city, location.address].filter(Boolean);
  if (!parts.length) return "";
  return `<p class="entry-location">📍 ${escapeHtml(parts.join(" · "))}</p>`;
}

function withEditorPrefix(text) {
  if (!text) return "";
  if (/^(神|祖心)：/.test(text)) return text;
  const editorName = getCurrentEditorName();
  return editorName ? `${editorName}：${text}` : text;
}

function openEditor(entry = {}) {
  if (!isEditMode()) return;
  editingId = entry.id || null;
  restoredAnniversaryDraft = null;
  form.reset();
  document.querySelector("#anniversaryDate").value = entry.date || toDateKey(new Date());
  document.querySelector("#anniversaryTitle").value = entry.title || "";
  document.querySelector("#anniversaryText").value = entry.text || "";
  countrySelect.value = entry.location?.country || "中国";
  renderProvinceOptions(countrySelect.value, entry.location?.province);
  renderCityOptions(provinceSelect.value, entry.location?.city);
  document.querySelector("#anniversaryAddress").value = entry.location?.address || "";
  renderExistingPhotoEditor(entry.photos || []);
  if (!editingId) {
    restoredAnniversaryDraft = restoreDraft(anniversaryDraftKey, form);
    renderProvinceOptions(countrySelect.value, provinceSelect.value);
    renderCityOptions(provinceSelect.value, citySelect.value);
  }
  deleteButton.style.visibility = editingId ? "visible" : "hidden";
  dialog.showModal();
}

function renderExistingPhotoEditor(photos = []) {
  existingPhotoEditor.innerHTML = photos.length
    ? `<h3>已有照片</h3><div class="existing-photo-grid">${photos
        .map((photo, index) => {
          const src = photo.data || photo.url || "";
          return `
            <label class="existing-photo-item">
              <img src="${src}" alt="${photo.name || "照片"}" />
              <span><input type="checkbox" data-delete-photo="${index}" /> 删除这张</span>
            </label>
          `;
        })
        .join("")}</div>`
    : "";
}

function renderCountryOptions() {
  countrySelect.innerHTML = Object.keys(locationOptions).map((country) => `<option value="${country}">${country}</option>`).join("");
}

function renderProvinceOptions(country, selectedProvince) {
  const provinces = locationOptions[country] || ["其他地区"];
  provinceSelect.innerHTML = provinces.map((province) => `<option value="${province}">${province}</option>`).join("");
  provinceSelect.value = selectedProvince && provinces.includes(selectedProvince) ? selectedProvince : provinces[0];
  renderCityOptions(provinceSelect.value);
}

function renderCityOptions(province, selectedCity) {
  const cities = cityOptions[province] || ["其他城市/市区"];
  citySelect.innerHTML = cities.map((city) => `<option value="${city}">${city}</option>`).join("");
  citySelect.value = selectedCity && cities.includes(selectedCity) ? selectedCity : cities[0];
}

function saveAndRender(selected) {
  anniversaries.sort((a, b) => a.date.localeCompare(b.date));
  saveSharedContent(anniversaryKey, anniversaries);
  renderCalendar();
  if (selected) showAnniversaryPage(selected);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function initAnniversaries() {
  renderCountryOptions();
  renderProvinceOptions("中国");
  anniversaries = YiXinStore.get(anniversaryKey, []);
  renderCalendar();
  anniversaries = await loadSharedContent(anniversaryKey, anniversaries);
  renderCalendar();
}

initAnniversaries();
