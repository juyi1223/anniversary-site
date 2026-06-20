const foodKey = "yixin.food";
const mealDraftKey = "meal";
const mealGoal = 500;

let food = { meals: [] };
let editingMealId = null;
let restoredMealDraft = null;

const mealGrid = document.querySelector("#mealGrid");
const mealCount = document.querySelector("#mealCount");
const mealRemain = document.querySelector("#mealRemain");
const mealProgressBar = document.querySelector("#mealProgressBar");
const proposalEgg = document.querySelector("#proposalEgg");
const mealDialog = document.querySelector("#mealDialog");
const mealForm = document.querySelector("#mealForm");
const deleteMealButton = document.querySelector("#deleteMeal");

document.querySelector("#addMeal").addEventListener("click", () => openMealEditor());
document.querySelector("#draftMeal").addEventListener("click", () => saveDraft(mealDraftKey, mealForm));

mealForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const existing = food.meals.find((meal) => meal.id === editingMealId);
  const photos = await prepareFiles(document.querySelector("#mealPhotos"), "food/photos");
  const meal = {
    id: editingMealId || uid(),
    number: existing?.number || nextMealNumber(),
    date: document.querySelector("#mealDate").value,
    title: document.querySelector("#mealTitle").value.trim(),
    rating: document.querySelector("#mealRating").value,
    text: document.querySelector("#mealText").value.trim(),
    photos: photos.length ? photos : restoredMealDraft?.files?.mealPhotos || existing?.photos || [],
  };

  food.meals = editingMealId
    ? food.meals.map((item) => (item.id === editingMealId ? meal : item))
    : [...food.meals, meal];
  food.meals.sort((a, b) => b.date.localeCompare(a.date));
  clearDraft(mealDraftKey);
  restoredMealDraft = null;
  saveFood();
  mealDialog.close();
});

deleteMealButton.addEventListener("click", () => {
  if (!editingMealId) return;
  food.meals = food.meals.filter((meal) => meal.id !== editingMealId);
  saveFood();
  mealDialog.close();
});

function renderFood() {
  const total = food.meals.length;
  const remaining = Math.max(mealGoal - total, 0);
  mealCount.textContent = total;
  mealRemain.textContent = total >= mealGoal ? "已经完成 500 顿" : `还差 ${remaining} 顿`;
  mealProgressBar.style.width = `${Math.min((total / mealGoal) * 100, 100)}%`;
  proposalEgg.hidden = total < mealGoal;

  if (!total) {
    mealGrid.innerHTML = `
      <div class="empty-state">
        <h2>记录第一顿饭</h2>
        <p>上传照片，写下那天吃了什么、聊了什么。</p>
      </div>
    `;
    return;
  }

  mealGrid.innerHTML = food.meals
    .map((meal) => {
      const number = meal.number || 1;
      const cover = meal.photos?.[0]?.data || meal.photos?.[0]?.url || "";
      return `
        <article class="meal-card">
          ${cover ? `<img src="${cover}" alt="${escapeHtml(meal.title)}" />` : `<img alt="" />`}
          <div class="meal-card-body">
            <p class="entry-date">第 ${number} 顿 · ${formatDate(meal.date)}</p>
            <h3>${escapeHtml(meal.title)}</h3>
            ${meal.rating ? `<span class="meal-rating">${escapeHtml(meal.rating)}</span>` : ""}
            <p>${escapeHtml(meal.text || "")}</p>
            <button class="ghost-button edit-only" data-meal="${meal.id}">编辑</button>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll("[data-meal]").forEach((button) => {
    button.addEventListener("click", () => {
      const meal = food.meals.find((item) => item.id === button.dataset.meal);
      openMealEditor(meal);
    });
  });
}

function openMealEditor(meal = {}) {
  if (!isEditMode()) return;
  editingMealId = meal.id || null;
  restoredMealDraft = null;
  mealForm.reset();
  document.querySelector("#mealDate").value = meal.date || new Date().toISOString().slice(0, 10);
  document.querySelector("#mealTitle").value = meal.title || "";
  document.querySelector("#mealRating").value = meal.rating || "夯爆了";
  document.querySelector("#mealText").value = meal.text || "";
  if (!editingMealId) restoredMealDraft = restoreDraft(mealDraftKey, mealForm);
  deleteMealButton.style.visibility = editingMealId ? "visible" : "hidden";
  mealDialog.showModal();
}

function normalizeFood(value) {
  if (Array.isArray(value?.meals)) {
    const sortedOldestFirst = [...value.meals].sort((a, b) => a.date.localeCompare(b.date));
    sortedOldestFirst.forEach((meal, index) => {
      if (!meal.number) meal.number = index + 1;
    });
    return { meals: value.meals };
  }
  if (Array.isArray(value?.brands)) {
    const meals = value.brands.flatMap((brand) =>
      (brand.meals || []).map((meal) => ({
        ...meal,
        title: meal.title || brand.name,
        rating: meal.rating || "",
      })),
    );
    meals.sort((a, b) => b.date.localeCompare(a.date));
    [...meals]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((meal, index) => {
        if (!meal.number) meal.number = index + 1;
      });
    return { meals };
  }
  return { meals: [] };
}

function nextMealNumber() {
  return food.meals.reduce((max, meal) => Math.max(max, meal.number || 0), 0) + 1;
}

function saveFood() {
  saveSharedContent(foodKey, food);
  renderFood();
}

async function initFood() {
  food = normalizeFood(await loadSharedContent(foodKey, { meals: [] }));
  renderFood();
}

initFood();
