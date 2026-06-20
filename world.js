const placeKey = "yixin.places";

const countries = [
  { code: "CN", name: "中国", color: "#e990a6" },
  { code: "JP", name: "日本", color: "#e990a6" },
  { code: "KR", name: "韩国", color: "#e990a6" },
  { code: "IN", name: "印度", color: "#e990a6" },
  { code: "RU", name: "俄罗斯", color: "#e990a6" },
  { code: "TH", name: "泰国", color: "#e990a6" },
  { code: "SG", name: "新加坡", color: "#e990a6" },
  { code: "ID", name: "印度尼西亚", color: "#e990a6" },
  { code: "AU", name: "澳大利亚", color: "#e990a6" },
  { code: "NZ", name: "新西兰", color: "#e990a6" },
  { code: "GB", name: "英国", color: "#e990a6" },
  { code: "FR", name: "法国", color: "#e990a6" },
  { code: "DE", name: "德国", color: "#e990a6" },
  { code: "IT", name: "意大利", color: "#e990a6" },
  { code: "ES", name: "西班牙", color: "#e990a6" },
  { code: "TR", name: "土耳其", color: "#e990a6" },
  { code: "EG", name: "埃及", color: "#e990a6" },
  { code: "ZA", name: "南非", color: "#e990a6" },
  { code: "NG", name: "尼日利亚", color: "#e990a6" },
  { code: "US", name: "美国", color: "#e990a6" },
  { code: "CA", name: "加拿大", color: "#e990a6" },
  { code: "MX", name: "墨西哥", color: "#e990a6" },
  { code: "BR", name: "巴西", color: "#e990a6" },
  { code: "AR", name: "阿根廷", color: "#e990a6" },
  { code: "CL", name: "智利", color: "#e990a6" },
];

let places = [];
let selectedCountry = "CN";
let editingPlaceId = null;
let pendingPosition = { x: 50, y: 50 };
let mapScale = 1;
let mapOffset = { x: 0, y: 0 };
let mapDragging = false;
let mapMoved = false;
let mapLast = { x: 0, y: 0 };

const countrySelect = document.querySelector("#countrySelect");
const placeCountry = document.querySelector("#placeCountry");
const countryTitle = document.querySelector("#countryTitle");
const countryMapTitle = document.querySelector("#countryMapTitle");
const countryPlaceCount = document.querySelector("#countryPlaceCount");
const countryPhotoCount = document.querySelector("#countryPhotoCount");
const countryMapViewport = document.querySelector("#countryMapViewport");
const countryMapCanvas = document.querySelector("#countryMapCanvas");
const countryMapShape = document.querySelector("#countryMapShape");
const placeMarkers = document.querySelector("#placeMarkers");
const placeDetail = document.querySelector("#placeDetail");
const placeDialog = document.querySelector("#placeDialog");
const placeForm = document.querySelector("#placeForm");
const deletePlaceButton = document.querySelector("#deletePlace");

document.querySelector("#addPlace").addEventListener("click", () => openPlaceEditor());
document.querySelector("#zoomIn").addEventListener("click", () => setMapScale(mapScale + 0.2));
document.querySelector("#zoomOut").addEventListener("click", () => setMapScale(mapScale - 0.2));
document.querySelector("#zoomReset").addEventListener("click", resetCountryMap);
countrySelect.addEventListener("change", () => selectCountry(countrySelect.value));

countryMapViewport.addEventListener("wheel", (event) => {
  event.preventDefault();
  setMapScale(mapScale + (event.deltaY < 0 ? 0.12 : -0.12));
});

countryMapViewport.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".photo-marker")) return;
  mapDragging = true;
  mapMoved = false;
  mapLast = { x: event.clientX, y: event.clientY };
  countryMapViewport.setPointerCapture(event.pointerId);
});

countryMapViewport.addEventListener("pointermove", (event) => {
  if (!mapDragging) return;
  if (Math.abs(event.clientX - mapLast.x) > 2 || Math.abs(event.clientY - mapLast.y) > 2) mapMoved = true;
  mapOffset.x += event.clientX - mapLast.x;
  mapOffset.y += event.clientY - mapLast.y;
  mapLast = { x: event.clientX, y: event.clientY };
  applyMapTransform();
});

countryMapViewport.addEventListener("pointerup", () => {
  mapDragging = false;
});

countryMapViewport.addEventListener("click", (event) => {
  if (!isEditMode() || event.target.closest(".photo-marker")) return;
  if (mapMoved) return;
  const rect = countryMapCanvas.getBoundingClientRect();
  pendingPosition = {
    x: clamp(((event.clientX - rect.left) / rect.width) * 100, 4, 96),
    y: clamp(((event.clientY - rect.top) / rect.height) * 100, 4, 96),
  };
  openPlaceEditor({ country: selectedCountry, x: pendingPosition.x, y: pendingPosition.y });
});

placeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const existing = places.find((item) => item.id === editingPlaceId);
    const photos = await prepareFiles(document.querySelector("#placePhotos"), "places/photos");
    const entry = {
      id: editingPlaceId || uid(),
      country: placeCountry.value,
      name: document.querySelector("#placeName").value.trim(),
      text: document.querySelector("#placeText").value.trim(),
      x: existing?.x ?? pendingPosition.x,
      y: existing?.y ?? pendingPosition.y,
      photos: photos.length ? photos : existing?.photos || [],
    };

    places = editingPlaceId ? places.map((item) => (item.id === editingPlaceId ? entry : item)) : [...places, entry];
    selectedCountry = entry.country;
    await savePlaces(entry.id);
    placeDialog.close();
  } catch (error) {
    alert(error.message || "保存失败，请稍后再试。");
  }
});

deletePlaceButton.addEventListener("click", async () => {
  if (!editingPlaceId) return;
  try {
    places = places.filter((item) => item.id !== editingPlaceId);
    await savePlaces();
    placeDialog.close();
  } catch (error) {
    alert(error.message || "删除失败，请稍后再试。");
  }
});

function mountCountryOptions() {
  const options = countries.map((country) => `<option value="${country.code}">${country.name}</option>`).join("");
  countrySelect.innerHTML = options;
  placeCountry.innerHTML = options;
}

function selectCountry(code) {
  selectedCountry = code;
  resetCountryMap();
  renderWorld();
}

function renderWorld(selectedPlaceId) {
  countrySelect.value = selectedCountry;
  const country = currentCountry();
  const countryPlaces = places.filter((place) => place.country === selectedCountry);
  countryTitle.textContent = country.name;
  countryMapTitle.textContent = `${country.name}地点地图`;
  countryPlaceCount.textContent = countryPlaces.length;
  countryPhotoCount.textContent = countryPlaces.reduce((sum, place) => sum + (place.photos?.length || 0), 0);
  countryMapShape.textContent = country.name;
  countryMapShape.style.setProperty("--country-color", country.color);
  renderMarkers();
  if (selectedPlaceId) showPlace(selectedPlaceId);
  if (!selectedPlaceId && !countryPlaces.length) {
    placeDetail.innerHTML = `<div class="empty-state"><h2>${country.name}还没有地点</h2><p>切到编辑模式，在地图上点击即可添加第一处回忆。</p></div>`;
  }
}

function renderMarkers() {
  placeMarkers.innerHTML = "";
  places
    .filter((place) => place.country === selectedCountry)
    .forEach((place) => {
      const marker = document.createElement("button");
      marker.className = "photo-marker";
      marker.type = "button";
      marker.style.left = `${place.x}%`;
      marker.style.top = `${place.y}%`;
      marker.innerHTML = place.photos?.[0]
        ? `<img src="${place.photos[0].data}" alt="${escapeHtml(place.name)}" /><span>${escapeHtml(place.name)}</span>`
        : `<span>${escapeHtml(place.name)}</span>`;
      marker.addEventListener("click", (event) => {
        event.stopPropagation();
        showPlace(place.id);
      });
      placeMarkers.appendChild(marker);
    });
}

function showPlace(id) {
  const place = places.find((item) => item.id === id);
  if (!place) return;
  placeDetail.innerHTML = `
    <div class="entry-hero">
      <div>
        <p class="entry-date">${countryName(place.country)} · 地图位置 ${Math.round(place.x)}, ${Math.round(place.y)}</p>
        <h2>${escapeHtml(place.name)}</h2>
      </div>
      <button class="ghost-button edit-only" id="editPlace">编辑</button>
    </div>
    <p class="entry-text">${escapeHtml(place.text || "还没有写下配文。")}</p>
    ${renderPhotos(place.photos)}
  `;
  document.querySelector("#editPlace").addEventListener("click", () => openPlaceEditor(place));
}

function openPlaceEditor(place = {}) {
  if (!isEditMode()) return;
  editingPlaceId = place.id || null;
  pendingPosition = { x: place.x ?? pendingPosition.x, y: place.y ?? pendingPosition.y };
  placeForm.reset();
  placeCountry.value = place.country || selectedCountry;
  document.querySelector("#placeName").value = place.name || "";
  document.querySelector("#placeText").value = place.text || "";
  deletePlaceButton.style.visibility = editingPlaceId ? "visible" : "hidden";
  placeDialog.showModal();
}

async function savePlaces(selectedId) {
  await saveSharedContent(placeKey, places);
  renderWorld(selectedId);
}

function setMapScale(nextScale) {
  mapScale = clamp(nextScale, 0.8, 2.4);
  applyMapTransform();
}

function resetCountryMap() {
  mapScale = 1;
  mapOffset = { x: 0, y: 0 };
  applyMapTransform();
}

function applyMapTransform() {
  countryMapCanvas.style.transform = `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${mapScale})`;
}

function normalizePlaces(savedPlaces) {
  return savedPlaces.map((place) => ({
    ...place,
    country: place.country || "CN",
    x: Number.isFinite(place.x) ? place.x : 50,
    y: Number.isFinite(place.y) ? place.y : 50,
  }));
}

function currentCountry() {
  return countries.find((country) => country.code === selectedCountry) || countries[0];
}

function countryName(code) {
  return countries.find((country) => country.code === code)?.name || "未知国家";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

async function initPlaces() {
  places = normalizePlaces(await loadSharedContent(placeKey, []));
  selectedCountry = places[0]?.country || "CN";
  renderWorld();
}

mountCountryOptions();
initPlaces();
