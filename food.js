const foodKey = "yixin.food";
const mealDraftKey = "meal";
const mealGoal = 500;
const defaultRating = "夯暴了";

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
let proposalMusicRequested = false;

document.querySelector("#addMeal").addEventListener("click", () => openMealEditor());
document.querySelector("#draftMeal").addEventListener("click", () => saveDraft(mealDraftKey, mealForm));

mealForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const editorName = getCurrentEditorName() || "未署名";
    const existing = food.meals.find((meal) => meal.id === editingMealId);
    const photos = await prepareFiles(document.querySelector("#mealPhotos"), "food/photos");
    const ratings = upsertMealRating(existing?.ratings || [], editorName, document.querySelector("#mealRating").value);
    const meal = {
      id: editingMealId || uid(),
      number: existing?.number || nextMealNumber(),
      date: document.querySelector("#mealDate").value,
      title: document.querySelector("#mealTitle").value.trim(),
      ratings,
      text: document.querySelector("#mealText").value.trim(),
      photos: photos.length ? photos : restoredMealDraft?.files?.mealPhotos || existing?.photos || [],
    };

    food.meals = editingMealId
      ? food.meals.map((item) => (item.id === editingMealId ? meal : item))
      : [...food.meals, meal];
    food.meals.sort((a, b) => b.date.localeCompare(a.date));
    clearDraft(mealDraftKey);
    restoredMealDraft = null;
    await saveFood();
    mealDialog.close();
  } catch (error) {
    alert(error.message || "保存失败，请稍后再试。");
  }
});

deleteMealButton.addEventListener("click", async () => {
  if (!editingMealId) return;
  try {
    food.meals = food.meals.filter((meal) => meal.id !== editingMealId);
    await saveFood();
    mealDialog.close();
  } catch (error) {
    alert(error.message || "删除失败，请稍后再试。");
  }
});

function renderFood() {
  const total = food.meals.length;
  const remaining = Math.max(mealGoal - total, 0);
  mealCount.textContent = total;
  mealRemain.textContent = total >= mealGoal ? "已经完成 500 顿" : `还差 ${remaining} 顿`;
  mealProgressBar.style.width = `${Math.min((total / mealGoal) * 100, 100)}%`;
  proposalEgg.hidden = total < mealGoal;
  if (total >= mealGoal && !proposalMusicRequested) {
    proposalMusicRequested = true;
    requestCityLoveMusic();
  }

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
            ${renderMealRatings(meal.ratings)}
            <p>${escapeHtml(meal.text || "")}</p>
            <button class="ghost-button edit-only" data-meal="${meal.id}">编辑/评价</button>
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

function renderMealRatings(ratings = []) {
  const activeRatings = ratings
    .map(normalizeMealRatingEditor)
    .filter((item) => item?.rating);
  if (!activeRatings.length) return "";
  return `
    <div class="meal-ratings">
      ${activeRatings
        .map((item) => `<span class="meal-rating">${escapeHtml(item.editor)}：${escapeHtml(item.rating)}</span>`)
        .join("")}
    </div>
  `;
}

function openMealEditor(meal = {}) {
  if (!isEditMode()) return;
  const editorName = getCurrentEditorName() || "未署名";
  editingMealId = meal.id || null;
  restoredMealDraft = null;
  mealForm.reset();
  document.querySelector("#mealDate").value = meal.date || new Date().toISOString().slice(0, 10);
  document.querySelector("#mealTitle").value = meal.title || "";
  document.querySelector("#mealRating").value = meal.ratings?.find((item) => item.editor === editorName)?.rating || defaultRating;
  document.querySelector("#mealText").value = meal.text || "";
  if (!editingMealId) restoredMealDraft = restoreDraft(mealDraftKey, mealForm);
  deleteMealButton.style.visibility = editingMealId ? "visible" : "hidden";
  mealDialog.showModal();
}

function upsertMealRating(ratings, editor, rating) {
  const nextRatings = ratings
    .map(normalizeMealRatingEditor)
    .filter((item) => item?.editor && item.editor !== editor);
  if (rating) nextRatings.push({ editor, rating });
  return nextRatings;
}

function normalizeFood(value) {
  const meals = Array.isArray(value?.meals)
    ? value.meals
    : Array.isArray(value?.brands)
      ? value.brands.flatMap((brand) =>
          (brand.meals || []).map((meal) => ({
            ...meal,
            title: meal.title || brand.name,
          })),
        )
      : [];

  const normalizedMeals = meals.map((meal) => ({
    ...meal,
    ratings: normalizeMealRatings(meal),
  }));

  [...normalizedMeals]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((meal, index) => {
      if (!meal.number) meal.number = index + 1;
    });

  normalizedMeals.sort((a, b) => b.date.localeCompare(a.date));
  return { meals: normalizedMeals };
}

function normalizeMealRatings(meal) {
  if (Array.isArray(meal.ratings)) {
    return meal.ratings.map(normalizeMealRatingEditor).filter((item) => item?.editor && item?.rating);
  }
  if (meal.rating) {
    return [normalizeMealRatingEditor({ editor: meal.editor || getCurrentEditorName() || "神", rating: meal.rating })];
  }
  return [];
}

function normalizeMealRatingEditor(item = {}) {
  const editor = item.editor === "祖心" ? "祖心" : "神";
  return { ...item, editor };
}

function nextMealNumber() {
  return food.meals.reduce((max, meal) => Math.max(max, meal.number || 0), 0) + 1;
}

async function saveFood() {
  await saveSharedContent(foodKey, food);
  renderFood();
}

async function initFood() {
  food = normalizeFood(await loadSharedContent(foodKey, { meals: [] }));
  renderFood();
}

initFood();
