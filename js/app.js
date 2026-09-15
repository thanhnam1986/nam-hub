/**
 * app.js - Điều phối toàn bộ ứng dụng Nam Hub
 */

import { initDB, exportBackupJSON, importBackupJSON, getTodayStr } from "./storage.js";
import { parseNaturalTask } from "./parser.js";
import { isSpeechSupported, startListening, stopListening } from "./voice.js";
import { getTasks, saveTask, removeTask, toggleTaskComplete, filterTodayTasks, filterImportantTasks } from "./tasks.js";
import { getMembers, saveMember, removeMember } from "./family.js";
import { getChildrenProfiles, saveChildProfile } from "./children.js";
import { getShoppingList, addShoppingItem, toggleShoppingItem, clearCheckedShopping } from "./shopping.js";
import { getBills, saveBill, removeBill, markBillPaid, formatVND, getCurrentMonthStr } from "./finance.js";
import { getWeekDays } from "./calendar.js";

// State
let currentTab = "today";
let currentFamilySubTab = "children";
let calendarRefDate = new Date();
let membersCache = [];
let editingTaskId = null;
let isVoiceListening = false;

// Khởi chạy khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", async () => {
  await initDB();
  membersCache = await getMembers();
  renderDateHeader();
  bindGlobalEvents();
  renderCurrentView();

  // Đăng ký Service Worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
});

function renderDateHeader() {
  const d = new Date();
  const dayNames = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dateHeader = document.getElementById("today-date-text");
  if (dateHeader) {
    dateHeader.textContent = `${dayNames[d.getDay()]}, ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }
}

function bindGlobalEvents() {
  // Bottom Navigation
  document.querySelectorAll(".nav-btn[data-tab]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const tab = e.currentTarget.getAttribute("data-tab");
      switchTab(tab);
    });
  });

  // Family Sub-tabs
  document.querySelectorAll(".sub-tab-btn[data-subtab]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const subtab = e.currentTarget.getAttribute("data-subtab");
      switchFamilySubTab(subtab);
    });
  });

  // Quick Add input & button
  const quickInput = document.getElementById("quick-add-input");
  const quickBtn = document.getElementById("btn-quick-add-submit");
  const quickMic = document.getElementById("btn-quick-mic");

  quickInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleQuickAdd();
  });
  quickBtn.addEventListener("click", handleQuickAdd);

  // Voice recognition mic
  if (quickMic) {
    if (!isSpeechSupported()) {
      quickMic.style.opacity = "0.5";
      quickMic.title = "Trình duyệt không hỗ trợ micro";
    }
    quickMic.addEventListener("click", toggleVoiceInput);
  }

  // Shopping Quick Add
  const shopInput = document.getElementById("shop-quick-input");
  const shopBtn = document.getElementById("btn-shop-add");
  const shopClearBtn = document.getElementById("btn-shop-clear");

  if (shopInput && shopBtn) {
    shopInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleShoppingAdd();
    });
    shopBtn.addEventListener("click", handleShoppingAdd);
  }
  if (shopClearBtn) {
    shopClearBtn.addEventListener("click", async () => {
      await clearCheckedShopping();
      renderShoppingTab();
    });
  }

  // Backup & Restore
  const btnExport = document.getElementById("btn-export-backup");
  const fileImport = document.getElementById("file-import-backup");
  if (btnExport) btnExport.addEventListener("click", () => exportBackupJSON());
  if (fileImport) {
    fileImport.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const res = await importBackupJSON(text);
      alert(res.message);
      if (res.success) location.reload();
    });
  }

  // Task Edit Modal
  const modalTask = document.getElementById("modal-task-detail");
  const btnCloseModal = document.getElementById("btn-close-task-modal");
  const btnSaveModal = document.getElementById("btn-save-task-detail");
  const btnDeleteModal = document.getElementById("btn-delete-task-detail");

  if (btnCloseModal) btnCloseModal.addEventListener("click", () => modalTask.classList.remove("open"));
  if (btnSaveModal) btnSaveModal.addEventListener("click", handleSaveTaskDetail);
  if (btnDeleteModal) btnDeleteModal.addEventListener("click", handleDeleteTaskDetail);

  // Calendar prev/next
  const btnCalPrev = document.getElementById("btn-cal-prev");
  const btnCalNext = document.getElementById("btn-cal-next");
  const btnCalToday = document.getElementById("btn-cal-today");
  if (btnCalPrev) btnCalPrev.addEventListener("click", () => {
    calendarRefDate.setDate(calendarRefDate.getDate() - 7);
    renderCalendarTab();
  });
  if (btnCalNext) btnCalNext.addEventListener("click", () => {
    calendarRefDate.setDate(calendarRefDate.getDate() + 7);
    renderCalendarTab();
  });
  if (btnCalToday) btnCalToday.addEventListener("click", () => {
    calendarRefDate = new Date();
    renderCalendarTab();
  });
}

function switchTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-tab") === tabName);
  });
  document.querySelectorAll(".tab-view").forEach((v) => {
    v.classList.toggle("active", v.id === `tab-view-${tabName}`);
  });
  renderCurrentView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchFamilySubTab(subTabName) {
  currentFamilySubTab = subTabName;
  document.querySelectorAll(".sub-tab-btn").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-subtab") === subTabName);
  });
  document.querySelectorAll(".family-sub-panel").forEach((p) => {
    p.classList.toggle("active", p.id === `subpanel-${subTabName}`);
  });
  if (subTabName === "children") renderChildrenTab();
  else if (subTabName === "shopping") renderShoppingTab();
  else if (subTabName === "finance") renderFinanceTab();
}

function renderCurrentView() {
  if (currentTab === "today") renderTodayTab();
  else if (currentTab === "tasks") renderAllTasksTab();
  else if (currentTab === "calendar") renderCalendarTab();
  else if (currentTab === "family") switchFamilySubTab(currentFamilySubTab);
  else if (currentTab === "settings") renderSettingsTab();
}

// -----------------------------------------------------------------------------
// TAB 1: HÔM NAY (TODAY DASHBOARD)
// -----------------------------------------------------------------------------
async function renderTodayTab() {
  const allTasks = await getTasks();
  const container = document.getElementById("today-sections-container");
  if (!container) return;

  container.innerHTML = "";
  const today = getTodayStr();

  // 1. Nhóm 🔴 QUAN TRỌNG
  const importantTasks = allTasks.filter((t) => !t.completed && (t.priority === "high" || (t.dueDate && t.dueDate < today)));
  if (importantTasks.length > 0) {
    const sec = createSectionElement("🔴 QUAN TRỌNG / CẦN LÀM NGAY", "#ef4444");
    importantTasks.forEach((t) => sec.querySelector(".section-task-list").appendChild(createTaskItemElement(t)));
    container.appendChild(sec);
  }

  // 2. Nhóm theo từng thành viên
  const activeMembers = await getMembers();
  for (const m of activeMembers) {
    const memberTasks = allTasks.filter((t) => !t.completed && t.memberId === m.id && (t.dueDate === today || !t.dueDate));
    if (memberTasks.length > 0) {
      const sec = createSectionElement(`${m.avatar} ${m.name.toUpperCase()}`, m.color);
      memberTasks.forEach((t) => sec.querySelector(".section-task-list").appendChild(createTaskItemElement(t)));
      container.appendChild(sec);
    }
  }

  // 3. Nhóm 💰 TÀI CHÍNH (Các khoản sắp đến hạn trong 5 ngày tới)
  const allBills = await getBills();
  const currDay = new Date().getDate();
  const urgentBills = allBills.filter((b) => b.status !== "paid" && Math.abs(b.dueDay - currDay) <= 5);
  if (urgentBills.length > 0) {
    const sec = createSectionElement("💰 TÀI CHÍNH SẮP ĐẾN HẠN", "#10b981");
    urgentBills.forEach((b) => {
      const billEl = document.createElement("div");
      billEl.className = "task-row";
      billEl.innerHTML = `
        <div style="flex:1;">
          <b>${b.name}</b>
          <div style="font-size:0.8rem; color:#94a3b8;">Hạn ngày ${b.dueDay} hàng tháng • <span style="color:#f59e0b;">${formatVND(b.amount)}</span></div>
        </div>
        <button class="btn-sm-action" onclick="window.payBillQuick('${b.id}')">✓ Đã đóng</button>
      `;
      sec.querySelector(".section-task-list").appendChild(billEl);
    });
    container.appendChild(sec);
  }

  // Nếu hoàn toàn không có việc nào
  if (container.children.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        <span style="font-size:2.5rem;">🎉</span>
        <h3>Hôm nay đã hoàn thành hết việc!</h3>
        <p style="color:#94a3b8; font-size:0.88rem; margin-top:4px;">Gõ vào ô bên dưới hoặc bấm micro để thêm việc mới.</p>
      </div>
    `;
  }
}

function createSectionElement(title, accentColor = "#3b82f6") {
  const div = document.createElement("div");
  div.className = "today-section-card";
  div.style.borderLeft = `4px solid ${accentColor}`;
  div.innerHTML = `
    <div class="today-section-header">
      <span class="today-section-title">${title}</span>
    </div>
    <div class="section-task-list"></div>
  `;
  return div;
}

function createTaskItemElement(task) {
  const row = document.createElement("div");
  row.className = `task-row ${task.completed ? "completed" : ""}`;

  const member = membersCache.find((m) => m.id === task.memberId) || { avatar: "🏠", name: "Gia đình" };
  const timeBadge = task.dueTime ? `<span class="badge-time">⏰ ${task.dueTime}</span>` : "";
  const recurringBadge = task.recurring && task.recurring !== "none" ? `<span class="badge-recurring">🔁 Lặp</span>` : "";

  row.innerHTML = `
    <label class="custom-checkbox">
      <input type="checkbox" ${task.completed ? "checked" : ""}>
      <span class="checkmark"></span>
    </label>
    <div class="task-info" style="cursor:pointer;">
      <div class="task-title">${task.title}</div>
      <div class="task-subtext">
        <span>${member.avatar} ${member.name}</span>
        ${timeBadge}
        ${recurringBadge}
      </div>
    </div>
  `;

  // Sự kiện toggle complete
  const checkbox = row.querySelector("input[type=checkbox]");
  checkbox.addEventListener("change", async (e) => {
    e.stopPropagation();
    row.classList.toggle("completed", checkbox.checked);
    await toggleTaskComplete(task.id);
    setTimeout(() => renderCurrentView(), 200);
  });

  // Sự kiện bấm mở modal sửa chi tiết
  row.querySelector(".task-info").addEventListener("click", () => {
    openTaskDetailModal(task);
  });

  return row;
}

// -----------------------------------------------------------------------------
// QUICK ADD & VOICE
// -----------------------------------------------------------------------------
async function handleQuickAdd() {
  const input = document.getElementById("quick-add-input");
  const rawText = input.value.trim();
  if (!rawText) return;

  const parsed = parseNaturalTask(rawText);
  if (parsed) {
    await saveTask(parsed);
    input.value = "";
    showToast(`✓ Đã thêm: "${parsed.title}"`);
    renderCurrentView();
  }
}

function toggleVoiceInput() {
  const micBtn = document.getElementById("btn-quick-mic");
  const input = document.getElementById("quick-add-input");

  if (isVoiceListening) {
    stopListening();
    isVoiceListening = false;
    micBtn.classList.remove("listening");
  } else {
    isVoiceListening = true;
    micBtn.classList.add("listening");
    showToast("🎙 Đang lắng nghe giọng nói...");

    startListening(
      (transcript) => {
        input.value = transcript;
        micBtn.classList.remove("listening");
        isVoiceListening = false;
        handleQuickAdd();
      },
      (err) => {
        micBtn.classList.remove("listening");
        isVoiceListening = false;
        showToast("Chưa nhận diện được, anh thử nói lại nhé.");
      },
      () => {
        micBtn.classList.remove("listening");
        isVoiceListening = false;
      }
    );
  }
}

// -----------------------------------------------------------------------------
// TAB 2: QUẢN LÝ TẤT CẢ VIỆC (TASKS)
// -----------------------------------------------------------------------------
async function renderAllTasksTab() {
  const allTasks = await getTasks();
  const listContainer = document.getElementById("all-tasks-list");
  if (!listContainer) return;

  listContainer.innerHTML = "";
  if (allTasks.length === 0) {
    listContainer.innerHTML = `<div class="empty-state-card"><p>Chưa có công việc nào trong danh sách.</p></div>`;
    return;
  }

  // Sắp xếp: chưa hoàn thành lên trước, theo ngày đến hạn
  allTasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.dueDate || "") > (b.dueDate || "") ? 1 : -1;
  });

  allTasks.forEach((t) => listContainer.appendChild(createTaskItemElement(t)));
}

// -----------------------------------------------------------------------------
// TAB 3: LỊCH TUẦN (WEEKLY CALENDAR)
// -----------------------------------------------------------------------------
async function renderCalendarTab() {
  const weekDays = getWeekDays(calendarRefDate);
  const weekHeader = document.getElementById("cal-week-range-text");
  const gridContainer = document.getElementById("cal-week-grid");
  if (!gridContainer) return;

  const firstDay = weekDays[0];
  const lastDay = weekDays[6];
  if (weekHeader) {
    weekHeader.textContent = `${firstDay.dayNum}/${firstDay.dateObj.getMonth() + 1} - ${lastDay.dayNum}/${lastDay.dateObj.getMonth() + 1}/${lastDay.dateObj.getFullYear()}`;
  }

  gridContainer.innerHTML = "";
  const allTasks = await getTasks();

  weekDays.forEach((day) => {
    const col = document.createElement("div");
    col.className = `cal-day-col ${day.isToday ? "today" : ""}`;

    const dayTasks = allTasks.filter((t) => t.dueDate === day.dateStr);

    col.innerHTML = `
      <div class="cal-day-header">
        <span class="cal-day-name">${day.dayName}</span>
        <span class="cal-day-num">${day.dayNum}</span>
      </div>
      <div class="cal-day-tasks"></div>
    `;

    const taskBox = col.querySelector(".cal-day-tasks");
    dayTasks.forEach((t) => {
      const m = membersCache.find((x) => x.id === t.memberId) || { color: "#3b82f6" };
      const pill = document.createElement("div");
      pill.className = `cal-task-pill ${t.completed ? "completed" : ""}`;
      pill.style.borderLeftColor = m.color;
      pill.textContent = `${t.dueTime ? t.dueTime + " " : ""}${t.title}`;
      pill.addEventListener("click", () => openTaskDetailModal(t));
      taskBox.appendChild(pill);
    });

    gridContainer.appendChild(col);
  });
}

// -----------------------------------------------------------------------------
// TAB 4: GIA ĐÌNH & CON CÁI (FAMILY, CHILDREN, SHOPPING, FINANCE)
// -----------------------------------------------------------------------------
async function renderChildrenTab() {
  const container = document.getElementById("children-profiles-container");
  if (!container) return;

  const profiles = await getChildrenProfiles();
  container.innerHTML = "";

  profiles.forEach((child) => {
    const card = document.createElement("div");
    card.className = "child-card";
    const subjectsHtml = (child.subjects || [])
      .map(
        (s) => `
        <div class="child-subject-item">
          <div style="display:flex; justify-content:space-between;">
            <b>📚 ${s.name}</b>
            <span style="font-size:0.8rem; color:#60a5fa;">${s.schedule}</span>
          </div>
          <div style="font-size:0.82rem; color:#94a3b8; margin-top:3px;">${s.note || ""}</div>
        </div>
      `
      )
      .join("");

    const goalsHtml = (child.goals || []).map((g) => `<li>🎯 ${g}</li>`).join("");

    card.innerHTML = `
      <div class="child-header">
        <div>
          <h3 style="font-size:1.15rem; font-weight:750;">${child.name}</h3>
          <div style="font-size:0.82rem; color:#94a3b8;">${child.school} • ${child.grade}</div>
        </div>
      </div>
      <div style="margin-top:10px;">
        <h4 style="font-size:0.9rem; color:#f8fafc; margin-bottom:6px;">Lịch học & Môn học:</h4>
        ${subjectsHtml}
      </div>
      <div style="margin-top:12px;">
        <h4 style="font-size:0.9rem; color:#f8fafc; margin-bottom:6px;">Mục tiêu học tập:</h4>
        <ul style="list-style:none; display:flex; flex-direction:column; gap:4px; font-size:0.85rem; color:#cbd5e1;">
          ${goalsHtml}
        </ul>
      </div>
    `;
    container.appendChild(card);
  });
}

async function renderShoppingTab() {
  const listContainer = document.getElementById("shopping-list-container");
  if (!listContainer) return;

  const items = await getShoppingList();
  listContainer.innerHTML = "";

  if (items.length === 0) {
    listContainer.innerHTML = `<div class="empty-state-card"><p>Chưa có món nào trong danh sách mua.</p></div>`;
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = `shopping-item-row ${item.checked ? "checked" : ""}`;
    row.innerHTML = `
      <label class="custom-checkbox">
        <input type="checkbox" ${item.checked ? "checked" : ""}>
        <span class="checkmark"></span>
      </label>
      <span class="shopping-item-name">${item.name}</span>
    `;

    const checkbox = row.querySelector("input[type=checkbox]");
    checkbox.addEventListener("change", async () => {
      row.classList.toggle("checked", checkbox.checked);
      await toggleShoppingItem(item.id);
    });

    listContainer.appendChild(row);
  });
}

async function handleShoppingAdd() {
  const input = document.getElementById("shop-quick-input");
  const name = input.value.trim();
  if (!name) return;

  await addShoppingItem(name);
  input.value = "";
  renderShoppingTab();
}

async function renderFinanceTab() {
  const container = document.getElementById("finance-bills-container");
  if (!container) return;

  const bills = await getBills();
  container.innerHTML = "";

  const currMonth = getCurrentMonthStr();
  bills.forEach((b) => {
    const isPaidThisMonth = b.lastPaidMonth === currMonth;
    const card = document.createElement("div");
    card.className = "bill-card";
    card.style.borderLeft = isPaidThisMonth ? "4px solid #10b981" : "4px solid #f59e0b";

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <b style="font-size:1rem; color:#fff;">${b.name}</b>
          <div style="font-size:0.82rem; color:#94a3b8; margin-top:2px;">
            Hạn đóng: ngày <b>${b.dueDay}</b> hàng tháng
          </div>
        </div>
        <span class="bill-amount">${formatVND(b.amount)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
        <span class="bill-status ${isPaidThisMonth ? "paid" : "pending"}">
          ${isPaidThisMonth ? "✓ Đã thanh toán tháng này" : "⏳ Chưa thanh toán"}
        </span>
        <button class="btn-sm-action" onclick="window.payBillQuick('${b.id}')">
          ${isPaidThisMonth ? "Đánh dấu lại" : "✓ Đã đóng tiền"}
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

window.payBillQuick = async function (billId) {
  await markBillPaid(billId);
  showToast("✓ Đã cập nhật trạng thái thanh toán!");
  renderCurrentView();
};

// -----------------------------------------------------------------------------
// TAB 5: CÀI ĐẶT & SAO LƯU (SETTINGS)
// -----------------------------------------------------------------------------
async function renderSettingsTab() {
  const membersListContainer = document.getElementById("settings-members-list");
  if (!membersListContainer) return;

  const members = await getMembers();
  membersListContainer.innerHTML = "";

  members.forEach((m) => {
    const row = document.createElement("div");
    row.className = "member-setting-row";
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:1.3rem;">${m.avatar}</span>
        <b>${m.name}</b>
        <span style="font-size:0.8rem; color:#94a3b8;">(${m.role})</span>
      </div>
      <div style="width:14px; height:14px; border-radius:50%; background:${m.color};"></div>
    `;
    membersListContainer.appendChild(row);
  });
}

// -----------------------------------------------------------------------------
// MODAL CHI TIẾT / SỬA TASK
// -----------------------------------------------------------------------------
function openTaskDetailModal(task) {
  editingTaskId = task.id;
  const modal = document.getElementById("modal-task-detail");

  document.getElementById("modal-task-title").value = task.title || "";
  document.getElementById("modal-task-member").value = task.memberId || "family";
  document.getElementById("modal-task-date").value = task.dueDate || getTodayStr();
  document.getElementById("modal-task-time").value = task.dueTime || "";
  document.getElementById("modal-task-priority").value = task.priority || "normal";
  document.getElementById("modal-task-recurring").value = task.recurring || "none";
  document.getElementById("modal-task-note").value = task.note || "";

  modal.classList.add("open");
}

async function handleSaveTaskDetail() {
  if (!editingTaskId) return;
  const allTasks = await getTasks();
  const task = allTasks.find((t) => t.id === editingTaskId);
  if (!task) return;

  task.title = document.getElementById("modal-task-title").value.trim() || task.title;
  task.memberId = document.getElementById("modal-task-member").value;
  task.dueDate = document.getElementById("modal-task-date").value;
  task.dueTime = document.getElementById("modal-task-time").value;
  task.priority = document.getElementById("modal-task-priority").value;
  task.recurring = document.getElementById("modal-task-recurring").value;
  task.note = document.getElementById("modal-task-note").value.trim();

  await saveTask(task);
  document.getElementById("modal-task-detail").classList.remove("open");
  editingTaskId = null;
  showToast("✓ Đã lưu thay đổi");
  renderCurrentView();
}

async function handleDeleteTaskDetail() {
  if (!editingTaskId) return;
  if (confirm("Anh có chắc muốn xóa công việc này không?")) {
    await removeTask(editingTaskId);
    document.getElementById("modal-task-detail").classList.remove("open");
    editingTaskId = null;
    showToast("Đã xóa công việc");
    renderCurrentView();
  }
}

function showToast(msg) {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = "toast show";
  setTimeout(() => {
    toast.className = "toast";
  }, 2400);
}
