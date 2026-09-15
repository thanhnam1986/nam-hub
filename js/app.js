/**
 * Nam Hub - Ứng dụng Quản lý Cuộc sống, Gia đình & Con cái
 * Tự thực thi độc lập (Standalone Bundle) - Không phụ thuộc ES Module loader
 */

/* --- Module: storage.js --- */
/**
 * storage.js - Cơ sở dữ liệu IndexedDB & Quản lý Backup/Restore JSON
 * Database: NamHubDB (v1)
 */

const DB_NAME = "NamHubDB";
const DB_VERSION = 1;
const STORES = ["tasks", "members", "children", "shopping", "bills", "settings"];

let dbInstance = null;

function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      STORES.forEach((sName) => {
        if (!db.objectStoreNames.contains(sName)) {
          db.createObjectStore(sName, { keyPath: "id" });
        }
      });
    };

    request.onsuccess = async (event) => {
      dbInstance = event.target.result;
      await seedDefaultDataIfEmpty();
      resolve(dbInstance);
    };

    request.onerror = (e) => reject(e.target.error);
  });
}

async function seedDefaultDataIfEmpty() {
  const members = await getAllItems("members");
  if (members.length === 0) {
    const defaultMembers = [
      { id: "nam", name: "Nam", role: "Bố", avatar: "👨", color: "#3b82f6", isChild: false, order: 1 },
      { id: "duyen", name: "Duyên", role: "Mẹ", avatar: "👩", color: "#ec4899", isChild: false, order: 2 },
      { id: "nhatanh", name: "Nhật Anh", role: "Con trai", avatar: "👦", color: "#10b981", isChild: true, order: 3 },
      { id: "bong", name: "Bông", role: "Con gái", avatar: "👧", color: "#f59e0b", isChild: true, order: 4 },
      { id: "family", name: "Gia đình", role: "Chung", avatar: "🏠", color: "#8b5cf6", isChild: false, order: 5 }
    ];
    for (const m of defaultMembers) await putItem("members", m);

    const defaultChildren = [
      {
        id: "child_nhatanh",
        memberId: "nhatanh",
        name: "Nhật Anh",
        school: "Trường Tiểu học",
        grade: "Lớp 4",
        subjects: [
          { name: "Toán", schedule: "Thứ 2, Thứ 4 (19:00 - 20:30)", note: "Ôn tập phân số và hình học" },
          { name: "Tiếng Anh", schedule: "Thứ 3, Thứ 6 (18:30 - 20:00)", note: "Học từ vựng Unit 8" },
          { name: "Tiếng Việt", schedule: "Thứ 5 (19:30 - 21:00)", note: "Tập làm văn miêu tả" }
        ],
        goals: ["Đạt học sinh xuất sắc kỳ 2", "Đọc xong 2 cuốn sách khoa học"]
      },
      {
        id: "child_bong",
        memberId: "bong",
        name: "Bông",
        school: "Trường Mầm non",
        grade: "Lớp Mẫu giáo Lớn",
        subjects: [
          { name: "Học vẽ", schedule: "Sáng Thứ 7 (08:30 - 10:00)", note: "Chuẩn bị sáp màu" },
          { name: "Làm quen chữ cái", schedule: "Hàng ngày tối", note: "Tập ghép vần" }
        ],
        goals: ["Tự giác dọn đồ chơi sau khi chơi", "Học thuộc 10 bài thơ thiếu nhi"]
      }
    ];
    for (const c of defaultChildren) await putItem("children", c);

    const today = getTodayStr();
    const defaultTasks = [
      { id: "t_1", title: "Học Python nâng cao 45 phút", memberId: "nam", category: "personal", dueDate: today, dueTime: "20:30", priority: "normal", recurring: "daily", completed: false, createdAt: new Date().toISOString() },
      { id: "t_2", title: "Tập gym / chạy bộ", memberId: "nam", category: "personal", dueDate: today, dueTime: "17:30", priority: "normal", recurring: "daily", completed: false, createdAt: new Date().toISOString() },
      { id: "t_3", title: "Chuẩn bị thực đơn gia đình tuần này", memberId: "duyen", category: "personal", dueDate: today, dueTime: "", priority: "normal", recurring: "weekly", completed: false, createdAt: new Date().toISOString() },
      { id: "t_4", title: "Đưa Nhật Anh đi học thêm Toán", memberId: "nhatanh", category: "children", dueDate: today, dueTime: "19:00", priority: "high", recurring: "weekly", completed: false, createdAt: new Date().toISOString() },
      { id: "t_5", title: "Đón Bông tan học", memberId: "bong", category: "children", dueDate: today, dueTime: "16:45", priority: "high", recurring: "daily", completed: false, createdAt: new Date().toISOString() },
      { id: "t_6", title: "Mua sữa và hoa quả tươi", memberId: "family", category: "shopping", dueDate: today, dueTime: "18:00", priority: "normal", recurring: "none", completed: false, createdAt: new Date().toISOString() }
    ];
    for (const t of defaultTasks) await putItem("tasks", t);

    const defaultShopping = [
      { id: "s_1", name: "Sữa tươi Vinamilk", category: "Thực phẩm", checked: false, createdAt: new Date().toISOString() },
      { id: "s_2", name: "Gạo lứt / Gạo thơm", category: "Lương thực", checked: false, createdAt: new Date().toISOString() },
      { id: "s_3", name: "Nước giặt Omo", category: "Gia dụng", checked: false, createdAt: new Date().toISOString() }
    ];
    for (const s of defaultShopping) await putItem("shopping", s);

    const defaultBills = [
      { id: "b_1", name: "Tiền điện sinh hoạt gia đình", amount: 900000, dueDay: 15, recurring: "monthly", memberId: "nam", status: "pending", lastPaidMonth: "" },
      { id: "b_2", name: "Cước Internet cáp quang", amount: 220000, dueDay: 20, recurring: "monthly", memberId: "nam", status: "pending", lastPaidMonth: "" },
      { id: "b_3", name: "Tiền nước sinh hoạt", amount: 150000, dueDay: 25, recurring: "monthly", memberId: "duyen", status: "pending", lastPaidMonth: "" }
    ];
    for (const b of defaultBills) await putItem("bills", b);
  }
}

function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getAllItems(storeName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getItem(storeName, id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function putItem(storeName, item) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function deleteItem(storeName, id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function clearStore(storeName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function exportBackupJSON() {
  const backup = {
    app: "Thành Nam",
    version: "1.0",
    exportedAt: new Date().toISOString(),
    data: {}
  };

  for (const s of STORES) {
    backup.data[s] = await getAllItems(s);
  }

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = getTodayStr().replace(/-/g, "");
  a.href = url;
  a.download = `ThanhNam_Backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importBackupJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.data || typeof parsed.data !== "object") {
      throw new Error("Tệp sao lưu không đúng định dạng của Thành Nam.");
    }

    for (const s of STORES) {
      if (Array.isArray(parsed.data[s])) {
        await clearStore(s);
        for (const item of parsed.data[s]) {
          await putItem(s, item);
        }
      }
    }
    return { success: true, message: "Khôi phục dữ liệu thành công!" };
  } catch (err) {
    return { success: false, message: err.message };
  }
}


/* --- Module: parser.js --- */
/**
 * parser.js - Bộ phân tích ngôn ngữ tự nhiên (NLP) tiếng Việt
 */


function parseNaturalTask(rawText) {
  if (!rawText || !rawText.trim()) return null;

  let text = rawText.trim();
  let memberId = "family";
  let priority = "normal";
  let category = "general";
  let dueDate = getTodayStr();
  let dueTime = "";
  let recurring = "none";

  const lower = text.toLowerCase();

  // 1. Phân loại thành viên
  if (lower.includes("nhật anh") || lower.includes("nhat anh") || lower.includes("con trai")) {
    memberId = "nhatanh";
    category = "children";
  } else if (lower.includes("bông") || lower.includes("bong") || lower.includes("con gái")) {
    memberId = "bong";
    category = "children";
  } else if (lower.includes("duyên") || lower.includes("duyen") || lower.includes("vợ") || lower.includes("mẹ")) {
    memberId = "duyen";
  } else if (lower.includes("nam") || lower.includes("tôi") || lower.includes("mình") || lower.includes("bố") || lower.includes("python") || lower.includes("gym")) {
    memberId = "nam";
  }

  // 2. Mức độ ưu tiên
  if (lower.includes("gấp") || lower.includes("khẩn cấp") || lower.includes("quan trọng") || lower.includes("hôm nay phải")) {
    priority = "high";
  }

  // 3. Danh mục
  if (lower.includes("tiền") || lower.includes("thanh toán") || lower.includes("đóng tiền") || lower.includes("vay") || lower.includes("nợ")) {
    category = "finance";
  } else if (lower.includes("mua") || lower.includes("chợ") || lower.includes("siêu thị") || lower.includes("tạp hóa")) {
    category = "shopping";
  } else if (lower.includes("học") || lower.includes("bài tập") || lower.includes("ôn thi") || lower.includes("lớp") || lower.includes("đón con")) {
    category = "children";
  }

  // 4. Xác định Ngày (Date)
  const now = new Date();
  if (lower.includes("ngày kia") || lower.includes("hôm kia") || lower.includes("mốt")) {
    const target = new Date(now.getTime() + 2 * 86400000);
    dueDate = formatDateStr(target);
  } else if (lower.includes("ngày mai") || lower.includes("mai")) {
    const target = new Date(now.getTime() + 86400000);
    dueDate = formatDateStr(target);
  } else if (lower.includes("hôm nay") || lower.includes("nay")) {
    dueDate = formatDateStr(now);
  } else {
    const weekdayMap = {
      "thứ 2": 1, "thứ hai": 1, "t2": 1,
      "thứ 3": 2, "thứ ba": 2, "t3": 2,
      "thứ 4": 3, "thứ tư": 3, "t4": 3,
      "thứ 5": 4, "thứ năm": 4, "t5": 4,
      "thứ 6": 5, "thứ sáu": 5, "t6": 5,
      "thứ 7": 6, "thứ bảy": 6, "t7": 6,
      "chủ nhật": 0, "cn": 0
    };

    for (const [key, targetDay] of Object.entries(weekdayMap)) {
      if (new RegExp(`\\b${key}\\b`, "i").test(lower)) {
        const currentDay = now.getDay();
        let diff = targetDay - currentDay;
        if (diff <= 0) diff += 7;
        const target = new Date(now.getTime() + diff * 86400000);
        dueDate = formatDateStr(target);
        break;
      }
    }
  }

  // 5. Xác định Giờ (Time)
  const timeRegex = /(?:lúc\s*)?(\d{1,2})(?:h|:)(\d{2})?|(?:lúc\s*)?(\d{1,2})\s*giờ(?:\s*(\d{1,2}))?/i;
  const timeMatch = text.match(timeRegex);

  if (timeMatch) {
    let hour = parseInt(timeMatch[1] || timeMatch[3], 10);
    let minute = parseInt(timeMatch[2] || timeMatch[4] || "0", 10);

    if (lower.includes("tối") || lower.includes("chiều")) {
      if (hour < 12) hour += 12;
    } else if (lower.includes("sáng")) {
      if (hour === 12) hour = 0;
    }

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      dueTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  } else {
    if (lower.includes("tối nay") || lower.includes("tối mai") || lower.includes("buổi tối")) {
      dueTime = "19:30";
    } else if (lower.includes("sáng nay") || lower.includes("sáng mai") || lower.includes("buổi sáng")) {
      dueTime = "08:00";
    } else if (lower.includes("chiều nay") || lower.includes("chiều mai") || lower.includes("buổi chiều")) {
      dueTime = "15:00";
    }
  }

  // 6. Lặp lại (Recurring)
  if (lower.includes("hàng ngày") || lower.includes("mỗi ngày")) recurring = "daily";
  else if (lower.includes("hàng tuần") || lower.includes("mỗi tuần")) recurring = "weekly";
  else if (lower.includes("hàng tháng") || lower.includes("mỗi tháng")) recurring = "monthly";

  // 7. Làm sạch tiêu đề
  let cleanTitle = text
    .replace(/(?:hôm nay|tối nay|sáng nay|chiều nay|ngày mai|tối mai|sáng mai|chiều mai|ngày kia|thứ [2-7]|thứ hai|thứ ba|thứ tư|thứ năm|thứ sáu|thứ bảy|chủ nhật)/gi, "")
    .replace(/(?:lúc\s*)?\d{1,2}(?:h|:)\d{0,2}/gi, "")
    .replace(/(?:lúc\s*)?\d{1,2}\s*giờ(?:\s*\d{1,2})?/gi, "")
    .replace(/(?:hàng ngày|hàng tuần|hàng tháng|mỗi ngày|mỗi tuần|mỗi tháng)/gi, "")
    .replace(/(?:gấp|khẩn cấp|quan trọng)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (cleanTitle) {
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  } else {
    cleanTitle = text;
  }

  return {
    id: "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    title: cleanTitle,
    memberId,
    category,
    dueDate,
    dueTime,
    priority,
    recurring,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    note: ""
  };
}

function formatDateStr(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}


/* --- Module: voice.js --- */
/**
 * voice.js - Nhận diện giọng nói tiếng Việt thêm việc nhanh
 */

let recognition = null;
let isRecording = false;

function isSpeechSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function startListening(onResult, onError, onEnd) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    if (onError) onError("Trình duyệt chưa hỗ trợ chuyển giọng nói thành văn bản.");
    return false;
  }

  try {
    recognition = new SpeechRec();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResult) onResult(transcript);
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (onError) onError(event.error);
    };

    recognition.onend = () => {
      isRecording = false;
      if (onEnd) onEnd();
    };

    recognition.start();
    isRecording = true;
    return true;
  } catch (err) {
    if (onError) onError(err.message);
    return false;
  }
}

function stopListening() {
  if (recognition) {
    try { recognition.stop(); } catch (_) {}
    recognition = null;
  }
  isRecording = false;
}


/* --- Module: tasks.js --- */
/**
 * tasks.js - Quản lý công việc & tự động sinh task lặp lại
 */


async function getTasks() {
  return await getAllItems("tasks");
}

async function saveTask(task) {
  return await putItem("tasks", task);
}

async function removeTask(taskId) {
  return await deleteItem("tasks", taskId);
}

async function toggleTaskComplete(taskId) {
  const task = await getItem("tasks", taskId);
  if (!task) return null;

  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;
  await putItem("tasks", task);

  if (task.completed && task.recurring && task.recurring !== "none") {
    await spawnNextRecurringTask(task);
  }

  return task;
}

async function spawnNextRecurringTask(prevTask) {
  const nextDateStr = calculateNextDueDate(prevTask.dueDate || getTodayStr(), prevTask.recurring);

  const nextTask = {
    ...prevTask,
    id: "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    dueDate: nextDateStr,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString()
  };

  await putItem("tasks", nextTask);
}

function calculateNextDueDate(dateStr, recurringType) {
  const parts = dateStr.split("-");
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

  if (recurringType === "daily") {
    d.setDate(d.getDate() + 1);
  } else if (recurringType === "weekly") {
    d.setDate(d.getDate() + 7);
  } else if (recurringType === "monthly") {
    d.setMonth(d.getMonth() + 1);
  } else if (recurringType === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function filterTodayTasks(allTasks) {
  const today = getTodayStr();
  return allTasks.filter(t => !t.completed && (t.dueDate <= today || !t.dueDate));
}

function filterImportantTasks(allTasks) {
  const today = getTodayStr();
  return allTasks.filter(t => !t.completed && (t.priority === "high" || t.dueDate < today));
}


/* --- Module: family.js --- */
/**
 * family.js - Quản lý thành viên gia đình
 */


async function getMembers() {
  const list = await getAllItems("members");
  return list.sort((a, b) => (a.order || 99) - (b.order || 99));
}

async function saveMember(member) {
  return await putItem("members", member);
}

async function removeMember(id) {
  return await deleteItem("members", id);
}


/* --- Module: children.js --- */
/**
 * children.js - Quản lý hồ sơ học tập con cái
 */


async function getChildrenProfiles() {
  return await getAllItems("children");
}

async function saveChildProfile(profile) {
  return await putItem("children", profile);
}

async function removeChildProfile(id) {
  return await deleteItem("children", id);
}


/* --- Module: shopping.js --- */
/**
 * shopping.js - Quản lý danh sách mua sắm gia đình
 */


async function getShoppingList() {
  const items = await getAllItems("shopping");
  return items.sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1));
}

async function addShoppingItem(name, category = "Gia đình") {
  if (!name || !name.trim()) return null;
  const item = {
    id: "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    name: name.trim(),
    category: category.trim(),
    checked: false,
    createdAt: new Date().toISOString()
  };
  return await putItem("shopping", item);
}

async function toggleShoppingItem(id) {
  const items = await getAllItems("shopping");
  const found = items.find(i => i.id === id);
  if (!found) return null;
  found.checked = !found.checked;
  return await putItem("shopping", found);
}

async function clearCheckedShopping() {
  const items = await getAllItems("shopping");
  for (const item of items) {
    if (item.checked) {
      await deleteItem("shopping", item.id);
    }
  }
}


/* --- Module: finance.js --- */
/**
 * finance.js - Quản lý các khoản chi tiêu / hóa đơn định kỳ gia đình
 */


async function getBills() {
  return await getAllItems("bills");
}

async function saveBill(bill) {
  return await putItem("bills", bill);
}

async function removeBill(id) {
  return await deleteItem("bills", id);
}

async function markBillPaid(id) {
  const bills = await getAllItems("bills");
  const b = bills.find(x => x.id === id);
  if (!b) return null;

  const currentMonthStr = getCurrentMonthStr();
  b.lastPaidMonth = currentMonthStr;
  b.status = "paid";
  return await putItem("bills", b);
}

function getCurrentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatVND(num) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num || 0);
}


/* --- Module: calendar.js --- */
/**
 * calendar.js - Lịch tuần trực quan cho cả gia đình
 */


function getWeekDays(referenceDate = new Date()) {
  const curr = new Date(referenceDate);
  const day = curr.getDay();
  const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diff));

  const week = [];
  for (let i = 0; i < 7; i++) {
    const next = new Date(monday);
    next.setDate(monday.getDate() + i);
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, "0");
    const d = String(next.getDate()).padStart(2, "0");
    const dayNames = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    week.push({
      dateStr: `${y}-${m}-${d}`,
      dayName: dayNames[next.getDay()],
      dayNum: next.getDate(),
      isToday: `${y}-${m}-${d}` === getTodayStr(),
      dateObj: next
    });
  }
  return week;
}


/* --- Module: app.js (Main Logic) --- */
/**
 * app.js - Điều phối toàn bộ ứng dụng Nam Hub
 */


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

// Service Worker đã được đăng ký trực tiếp từ index.html
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

  if (btnCloseModal) btnCloseModal.addEventListener("click", () => { modalTask.classList.remove("open"); editingTaskId = null; });
  if (modalTask) modalTask.addEventListener("click", (e) => { if (e.target === modalTask) { modalTask.classList.remove("open"); editingTaskId = null; } });
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
  const modal = document.getElementById("modal-task-detail");
  if (!editingTaskId) {
    if (modal) modal.classList.remove("open");
    return;
  }
  const allTasks = await getTasks();
  const task = allTasks.find((t) => t.id === editingTaskId);
  if (!task) {
    if (modal) modal.classList.remove("open");
    editingTaskId = null;
    return;
  }

  task.title = document.getElementById("modal-task-title").value.trim() || task.title;
  task.memberId = document.getElementById("modal-task-member").value;
  task.dueDate = document.getElementById("modal-task-date").value;
  task.dueTime = document.getElementById("modal-task-time").value;
  task.priority = document.getElementById("modal-task-priority").value;
  task.recurring = document.getElementById("modal-task-recurring").value;
  task.note = document.getElementById("modal-task-note").value.trim();

  await saveTask(task);
  if (modal) modal.classList.remove("open");
  editingTaskId = null;
  showToast("✓ Đã lưu thay đổi");
  renderCurrentView();
}

async function handleDeleteTaskDetail() {
  const modal = document.getElementById("modal-task-detail");
  if (!editingTaskId) {
    if (modal) modal.classList.remove("open");
    return;
  }
  const confirmed = typeof window.__SKIP_CONFIRM__ !== "undefined" ? true : confirm("Anh có chắc muốn xóa công việc này không?");
  if (confirmed) {
    await removeTask(editingTaskId);
    if (modal) modal.classList.remove("open");
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
