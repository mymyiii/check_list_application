const ITEMS_STORAGE_KEY = "carry-checker-items-v5";
const SCHEDULE_STORAGE_KEY = "carry-checker-schedule-v2";
const SESSION_STORAGE_KEY = "carry-checker-session-v1";
const HISTORY_STORAGE_KEY = "carry-checker-history-v1";
const UI_STORAGE_KEY = "carry-checker-ui-v1";

const STATUS = {
  PENDING: "pending",
  PACKED: "packed",
  USED_UP: "usedUp"
};

const TRIP_STATUS = {
  PREPARING: "preparing",
  READY_TO_GO: "readyToGo",
  GOING_HOME: "goingHome",
  ARRIVED: "arrived"
};

const DEFAULT_OFFSETS = [180, 60, 15];

let items = loadItems();
let schedule = loadSchedule();
let sessionState = loadSessionState();
let history = loadHistory();
let uiState = loadUiState();
let editingItemId = null;

if (items.length === 0) {
  items = [
    createItem("財布", "必需品", 1, false, STATUS.PENDING),
    createItem("家の鍵", "必需品", 1, false, STATUS.PENDING),
    createItem("充電器", "ガジェット", 1, false, STATUS.PENDING),
    createItem("洗顔", "美容・ケア", 1, true, STATUS.PENDING),
    createItem("お土産", "お土産", 2, false, STATUS.PENDING)
  ];
  saveItems();
}

function createItem(name, category, quantity, isConsumable, status = STATUS.PENDING, forgottenCount = 0) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    name,
    category,
    quantity,
    isConsumable,
    status,
    forgottenCount
  };
}

function createDefaultSchedule() {
  return {
    departureAt: "",
    reminderOffsets: [...DEFAULT_OFFSETS],
    sentReminders: {}
  };
}

function createDefaultSessionState() {
  return {
    tripStatus: TRIP_STATUS.PREPARING,
    completionModalShown: false
  };
}

function createDefaultUiState() {
  return {
    pendingExpanded: true,
    completedExpanded: false
  };
}

function loadItems() {
  try {
    const raw = localStorage.getItem(ITEMS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("load items error", error);
    return [];
  }
}

function saveItems() {
  localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items));
}

function loadSchedule() {
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) return createDefaultSchedule();

    const parsed = JSON.parse(raw);
    return {
      departureAt: parsed.departureAt || "",
      reminderOffsets: Array.isArray(parsed.reminderOffsets) ? parsed.reminderOffsets : [...DEFAULT_OFFSETS],
      sentReminders: parsed.sentReminders || {}
    };
  } catch (error) {
    console.error("load schedule error", error);
    return createDefaultSchedule();
  }
}

function saveScheduleState() {
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedule));
}

function loadSessionState() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return createDefaultSessionState();

    const parsed = JSON.parse(raw);
    return {
      tripStatus: parsed.tripStatus || TRIP_STATUS.PREPARING,
      completionModalShown: Boolean(parsed.completionModalShown)
    };
  } catch (error) {
    console.error("load session error", error);
    return createDefaultSessionState();
  }
}

function saveSessionState() {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionState));
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("load history error", error);
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

function loadUiState() {
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEY);
    if (!raw) return createDefaultUiState();

    const parsed = JSON.parse(raw);
    return {
      pendingExpanded: parsed.pendingExpanded !== false,
      completedExpanded: parsed.completedExpanded === true
    };
  } catch (error) {
    console.error("load ui error", error);
    return createDefaultUiState();
  }
}

function saveUiState() {
  localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(uiState));
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });

  document.getElementById(id).classList.add("active");

  if (id === "scheduleEdit") {
    renderScheduleForm();
  }

  renderAll();
  checkTimedReminder();
  checkCompletionState();
}

function changeQty(delta) {
  const qtyInput = document.getElementById("itemQty");
  const current = Number(qtyInput.value) || 1;
  const next = Math.max(1, current + delta);
  qtyInput.value = next;
}

function resetItemForm() {
  editingItemId = null;
  document.getElementById("itemEditTitle").textContent = "アイテム追加";
  document.getElementById("saveItemButton").textContent = "保存する";
  document.getElementById("deleteItemButton").classList.add("hidden");

  document.getElementById("itemName").value = "";
  document.getElementById("itemCategory").value = "必需品";
  document.getElementById("itemQty").value = 1;
  document.getElementById("isConsumable").checked = false;
}

function openCreateItemScreen() {
  resetItemForm();
  showScreen("itemEdit");
}

function openEditItemScreen(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;

  editingItemId = id;
  document.getElementById("itemEditTitle").textContent = "アイテム編集";
  document.getElementById("saveItemButton").textContent = "更新する";
  document.getElementById("deleteItemButton").classList.remove("hidden");

  document.getElementById("itemName").value = item.name;
  document.getElementById("itemCategory").value = item.category;
  document.getElementById("itemQty").value = item.quantity;
  document.getElementById("isConsumable").checked = item.isConsumable;

  showScreen("itemEdit");
}

function saveItem() {
  const name = document.getElementById("itemName").value.trim();
  const category = document.getElementById("itemCategory").value;
  const quantity = Math.max(1, Number(document.getElementById("itemQty").value) || 1);
  const isConsumable = document.getElementById("isConsumable").checked;

  if (!name) {
    alert("アイテム名を入力してください。");
    return;
  }

  if (editingItemId) {
    const target = items.find((item) => item.id === editingItemId);
    if (!target) return;

    target.name = name;
    target.category = category;
    target.quantity = quantity;
    target.isConsumable = isConsumable;

    if (!isConsumable && target.status === STATUS.USED_UP) {
      target.status = STATUS.PACKED;
    }
  } else {
    items.push(createItem(name, category, quantity, isConsumable, STATUS.PENDING));
    sessionState.tripStatus = TRIP_STATUS.PREPARING;
    sessionState.completionModalShown = false;
    saveSessionState();
  }

  saveItems();
  resetItemForm();
  showScreen("checklist");
}

function deleteCurrentItem() {
  if (!editingItemId) return;

  items = items.filter((item) => item.id !== editingItemId);
  saveItems();

  if (getPendingItems().length > 0) {
    sessionState.tripStatus = TRIP_STATUS.PREPARING;
    sessionState.completionModalShown = false;
    saveSessionState();
  }

  resetItemForm();
  showScreen("checklist");
}

function setItemStatus(id, status) {
  const target = items.find((item) => item.id === id);
  if (!target) return;

  if (status === STATUS.USED_UP && !target.isConsumable) {
    return;
  }

  target.status = status;
  saveItems();

  if (status === STATUS.PENDING) {
    sessionState.tripStatus = TRIP_STATUS.PREPARING;
    sessionState.completionModalShown = false;
    saveSessionState();
  }

  renderAll();
  checkCompletionState();
}

function getPendingItems() {
  return items.filter((item) => item.status === STATUS.PENDING);
}

function getCompletedItems() {
  return items.filter((item) => item.status === STATUS.PACKED || item.status === STATUS.USED_UP);
}

function getProgressPercent() {
  if (items.length === 0) return 0;
  return Math.round((getCompletedItems().length / items.length) * 100);
}

function getForgottenItemsSorted() {
  return [...items]
    .filter((item) => item.forgottenCount > 0)
    .sort((a, b) => b.forgottenCount - a.forgottenCount);
}

function getStatusLabel(status) {
  if (status === STATUS.PENDING) return "未対応";
  if (status === STATUS.PACKED) return "荷物に入れた";
  if (status === STATUS.USED_UP) return "使い切った";
  return "";
}

function getTripStatusLabel(status) {
  if (status === TRIP_STATUS.PREPARING) return "準備中";
  if (status === TRIP_STATUS.READY_TO_GO) return "準備完了";
  if (status === TRIP_STATUS.GOING_HOME) return "帰宅中";
  if (status === TRIP_STATUS.ARRIVED) return "到着済み";
  return "準備中";
}

function sortItemsForDisplay(sourceItems) {
  return [...sourceItems].sort((a, b) => {
    if (b.forgottenCount !== a.forgottenCount) return b.forgottenCount - a.forgottenCount;
    return a.name.localeCompare(b.name, "ja");
  });
}

function toggleSection(sectionName) {
  if (sectionName === "pending") {
    uiState.pendingExpanded = !uiState.pendingExpanded;
  }
  if (sectionName === "completed") {
    uiState.completedExpanded = !uiState.completedExpanded;
  }
  saveUiState();
  renderSectionVisibility();
}

function renderSectionVisibility() {
  const pendingItemsEl = document.getElementById("pendingItems");
  const completedItemsEl = document.getElementById("completedItems");

  pendingItemsEl.classList.toggle("collapsed", !uiState.pendingExpanded);
  completedItemsEl.classList.toggle("collapsed", !uiState.completedExpanded);

  document.getElementById("pendingToggleIcon").textContent = uiState.pendingExpanded ? "−" : "＋";
  document.getElementById("completedToggleIcon").textContent = uiState.completedExpanded ? "−" : "＋";
}

function renderHome() {
  const uncheckedCount = getPendingItems().length;
  const consumableCount = items.filter((item) => item.isConsumable).length;
  const progressPercent = getProgressPercent();

  document.getElementById("homeUncheckedCount").textContent = `${uncheckedCount}件`;
  document.getElementById("homeProgressText").textContent = `${progressPercent}%`;
  document.getElementById("homeProgressFill").style.width = `${progressPercent}%`;
  document.getElementById("remindTargetCount").textContent = `${uncheckedCount}件`;
  document.getElementById("consumableCount").textContent = `${consumableCount}件`;
  document.getElementById("tripStatusDisplay").textContent = getTripStatusLabel(sessionState.tripStatus);

  document.getElementById("departureDisplay").textContent = schedule.departureAt
    ? formatDateTime(schedule.departureAt)
    : "未設定";

  document.getElementById("nextReminderDisplay").textContent = getNextReminderDisplayText();

  const forgottenPreview = document.getElementById("forgottenItemsPreview");
  const forgottenItems = getForgottenItemsSorted().slice(0, 3);

  if (forgottenItems.length === 0) {
    forgottenPreview.textContent = "まだ記録はありません";
  } else {
    forgottenPreview.innerHTML = forgottenItems
      .map((item) => `${escapeHtml(item.name)}（${item.forgottenCount}回）`)
      .join("<br>");
  }

  renderTripActionArea("tripActionArea");
}

function renderTripActionArea(containerId) {
  const container = document.getElementById(containerId);

  if (sessionState.tripStatus === TRIP_STATUS.PREPARING) {
    container.innerHTML = `
      <div class="action-note">まだ準備中です。未対応のアイテムを確認してください。</div>
    `;
    return;
  }

  if (sessionState.tripStatus === TRIP_STATUS.READY_TO_GO) {
    container.innerHTML = `
      <div class="action-note">持ち帰り準備が完了しています。</div>
      <button class="btn" onclick="startGoingHome()">帰宅する</button>
    `;
    return;
  }

  if (sessionState.tripStatus === TRIP_STATUS.GOING_HOME) {
    container.innerHTML = `
      <div class="action-note">いまは帰宅中です。到着したら完了してください。</div>
      <button class="btn" onclick="markArrived()">到着した</button>
    `;
    return;
  }

  if (sessionState.tripStatus === TRIP_STATUS.ARRIVED) {
    const latest = history[0];
    container.innerHTML = `
      <div class="action-note">今回の持ち帰りは完了しています。</div>
      ${latest ? `<div class="history-note">記録日時：${formatDateTime(latest.endedAt)}</div>` : ""}
      <button class="btn" onclick="startNextTrip()">次の帰省を始める</button>
    `;
  }
}

function renderItemSection(containerId, targetItems, emptyText) {
  const container = document.getElementById(containerId);
  const sortedItems = sortItemsForDisplay(targetItems);

  container.innerHTML = "";

  if (sortedItems.length === 0) {
    container.innerHTML = `<div class="empty">${emptyText}</div>`;
    return;
  }

  sortedItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = "list-item";

    row.innerHTML = `
      <div class="item-main">
        <div class="item-content">
          <div class="item-main-top">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <button class="edit-link" onclick="openEditItemScreen('${item.id}')">編集</button>
          </div>
          <div class="item-meta">
            <span class="badge">${escapeHtml(item.category)}</span>
            <span class="badge">個数 ${item.quantity}</span>
            <span class="badge">状態 ${getStatusLabel(item.status)}</span>
            ${item.isConsumable ? `<span class="badge">使い切り予定</span>` : ""}
            ${item.forgottenCount > 0 ? `<span class="badge">忘れやすい ${item.forgottenCount}回</span>` : ""}
          </div>
        </div>
      </div>
      <div class="status-group">
        <button
          class="status-btn ${item.status === STATUS.PENDING ? "active" : ""}"
          onclick="setItemStatus('${item.id}', '${STATUS.PENDING}')"
        >
          未対応
        </button>
        <button
          class="status-btn ${item.status === STATUS.PACKED ? "active" : ""}"
          onclick="setItemStatus('${item.id}', '${STATUS.PACKED}')"
        >
          荷物に入れた
        </button>
        ${
          item.isConsumable
            ? `<button
                class="status-btn ${item.status === STATUS.USED_UP ? "active" : ""}"
                onclick="setItemStatus('${item.id}', '${STATUS.USED_UP}')"
              >
                使い切った
              </button>`
            : ""
        }
      </div>
    `;

    container.appendChild(row);
  });
}

function renderChecklist() {
  const pendingItems = getPendingItems();
  const completedItems = getCompletedItems();

  renderItemSection("pendingItems", pendingItems, "未対応のアイテムはありません。");
  renderItemSection("completedItems", completedItems, "まだチェック済みのアイテムはありません。");

  document.getElementById("pendingCountBadge").textContent = pendingItems.length;
  document.getElementById("completedCountBadge").textContent = completedItems.length;

  const completed = completedItems.length;
  const total = items.length;
  const percent = getProgressPercent();

  document.getElementById("checklistProgressText").textContent = `${completed} / ${total}`;
  document.getElementById("checklistProgressFill").style.width = `${percent}%`;

  renderSectionVisibility();
  renderChecklistActionArea();
}

function renderChecklistActionArea() {
  const container = document.getElementById("checklistActionArea");

  if (sessionState.tripStatus === TRIP_STATUS.READY_TO_GO) {
    container.innerHTML = `<button class="btn" onclick="startGoingHome()">帰宅する</button>`;
    return;
  }

  if (sessionState.tripStatus === TRIP_STATUS.GOING_HOME) {
    container.innerHTML = `<button class="btn" onclick="markArrived()">到着した</button>`;
    return;
  }

  if (sessionState.tripStatus === TRIP_STATUS.ARRIVED) {
    container.innerHTML = `<button class="btn" onclick="startNextTrip()">次の帰省を始める</button>`;
    return;
  }

  container.innerHTML = `<button class="btn" onclick="openReminderModal('manual')">帰る前に確認</button>`;
}

function renderScheduleForm() {
  document.getElementById("departureAt").value = schedule.departureAt || "";
  document.getElementById("offset180").checked = schedule.reminderOffsets.includes(180);
  document.getElementById("offset60").checked = schedule.reminderOffsets.includes(60);
  document.getElementById("offset15").checked = schedule.reminderOffsets.includes(15);
}

function saveSchedule() {
  const departureAt = document.getElementById("departureAt").value;

  const reminderOffsets = [
    document.getElementById("offset180").checked ? 180 : null,
    document.getElementById("offset60").checked ? 60 : null,
    document.getElementById("offset15").checked ? 15 : null
  ].filter(Boolean);

  if (!departureAt) {
    alert("帰る日時を入力してください。");
    return;
  }

  schedule.departureAt = departureAt;
  schedule.reminderOffsets = reminderOffsets;
  schedule.sentReminders = {};
  saveScheduleState();
  showScreen("home");
}

function resetSchedule() {
  schedule = createDefaultSchedule();
  saveScheduleState();
  renderScheduleForm();
  renderAll();
}

function getReminderStageToSend() {
  if (!schedule.departureAt || schedule.reminderOffsets.length === 0) {
    return null;
  }

  const departureTime = new Date(schedule.departureAt).getTime();
  if (Number.isNaN(departureTime)) return null;

  const now = Date.now();
  const sortedOffsets = [...schedule.reminderOffsets].sort((a, b) => a - b);

  let matchedOffset = null;

  for (const offset of sortedOffsets) {
    const triggerTime = departureTime - offset * 60 * 1000;
    if (now >= triggerTime && !schedule.sentReminders[String(offset)]) {
      matchedOffset = offset;
    }
  }

  return matchedOffset;
}

function checkTimedReminder() {
  const pendingItems = getPendingItems();
  if (pendingItems.length === 0) return;
  if (sessionState.tripStatus !== TRIP_STATUS.PREPARING) return;

  const offset = getReminderStageToSend();
  if (offset === null) return;

  schedule.sentReminders[String(offset)] = true;
  saveScheduleState();
  openReminderModal("timed", offset);
}

function getNextReminderDisplayText() {
  if (!schedule.departureAt || schedule.reminderOffsets.length === 0) {
    return "未設定";
  }

  const departureTime = new Date(schedule.departureAt).getTime();
  if (Number.isNaN(departureTime)) return "未設定";

  const now = Date.now();
  const futureOffsets = [...schedule.reminderOffsets]
    .sort((a, b) => b - a)
    .map((offset) => ({
      offset,
      triggerTime: departureTime - offset * 60 * 1000
    }))
    .filter((entry) => entry.triggerTime > now && !schedule.sentReminders[String(entry.offset)]);

  if (futureOffsets.length === 0) {
    return "通知予定なし";
  }

  const next = futureOffsets[0];
  return `${formatOffsetLabel(next.offset)}（${formatDateTime(new Date(next.triggerTime).toISOString().slice(0, 16))}）`;
}

function formatOffsetLabel(offset) {
  if (offset === 180) return "3時間前";
  if (offset === 60) return "1時間前";
  if (offset === 15) return "15分前";
  return `${offset}分前`;
}

function formatDateTime(value) {
  if (!value) return "未設定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未設定";

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");

  return `${y}/${m}/${d} ${hh}:${mm}`;
}

function openReminderModal(mode = "manual", offset = null) {
  const uncheckedItems = getPendingItems();
  const list = document.getElementById("modalUncheckedList");
  const title = document.getElementById("modalTitle");
  const description = document.getElementById("modalDescription");
  const reminderInfo = document.getElementById("modalReminderInfo");

  list.innerHTML = "";

  if (mode === "timed" && offset !== null) {
    title.textContent = `${formatOffsetLabel(offset)}の確認タイミングです`;
    description.textContent = "帰る予定の時間が近づいています。未対応のアイテムを確認してください。";
    reminderInfo.textContent = schedule.departureAt
      ? `帰る予定：${formatDateTime(schedule.departureAt)}`
      : "";
  } else {
    title.textContent = "まだ確認が終わっていません";
    description.textContent = "未対応のアイテムがあります。";
    reminderInfo.textContent = schedule.departureAt
      ? `帰る予定：${formatDateTime(schedule.departureAt)}`
      : "";
  }

  if (uncheckedItems.length === 0) {
    list.innerHTML = "<li>未対応のアイテムはありません。準備完了です。</li>";
  } else {
    uncheckedItems.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.name}（${item.category} / ${item.quantity}個）`;
      list.appendChild(li);
    });
  }

  document.getElementById("modal").style.display = "flex";
}

function closeReminderModal() {
  document.getElementById("modal").style.display = "none";
}

function openCompletionModal() {
  document.getElementById("completionModal").style.display = "flex";
}

function closeCompletionModal() {
  document.getElementById("completionModal").style.display = "none";
}

function startGoingHomeFromModal() {
  closeCompletionModal();
  startGoingHome();
}

function startGoingHome() {
  sessionState.tripStatus = TRIP_STATUS.GOING_HOME;
  saveSessionState();
  renderAll();
  showScreen("home");
}

function openArrivalModal() {
  document.getElementById("arrivalModal").style.display = "flex";
}

function closeArrivalModal() {
  document.getElementById("arrivalModal").style.display = "none";
}

function markArrived() {
  saveTripHistorySnapshot();

  sessionState.tripStatus = TRIP_STATUS.ARRIVED;
  saveSessionState();
  renderAll();
  openArrivalModal();
  showScreen("home");
}

function saveTripHistorySnapshot() {
  const snapshot = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    endedAt: new Date().toISOString().slice(0, 16),
    departureAt: schedule.departureAt,
    tripStatus: TRIP_STATUS.ARRIVED,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      isConsumable: item.isConsumable,
      status: item.status
    }))
  };

  const pendingItems = getPendingItems();
  pendingItems.forEach((item) => {
    item.forgottenCount += 1;
  });
  saveItems();

  history.unshift(snapshot);
  saveHistory();
}

function checkCompletionState() {
  if (items.length === 0) return;
  if (getPendingItems().length !== 0) return;
  if (sessionState.tripStatus === TRIP_STATUS.GOING_HOME || sessionState.tripStatus === TRIP_STATUS.ARRIVED) return;

  sessionState.tripStatus = TRIP_STATUS.READY_TO_GO;

  if (!sessionState.completionModalShown) {
    sessionState.completionModalShown = true;
    saveSessionState();
    renderAll();
    openCompletionModal();
    return;
  }

  saveSessionState();
  renderAll();
}

function markPendingAsForgotten() {
  const pendingItems = getPendingItems();
  pendingItems.forEach((item) => {
    item.forgottenCount += 1;
  });
  saveItems();
  renderAll();
}

function renderAll() {
  renderHome();
  renderChecklist();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

renderAll();
renderScheduleForm();
resetItemForm();
renderSectionVisibility();
checkTimedReminder();
checkCompletionState();
