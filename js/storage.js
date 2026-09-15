/**
 * storage.js - Cơ sở dữ liệu IndexedDB & Quản lý Backup/Restore JSON
 * Database: NamHubDB (v1)
 */

const DB_NAME = "NamHubDB";
const DB_VERSION = 1;
const STORES = ["tasks", "members", "children", "shopping", "bills", "settings"];

let dbInstance = null;

export function initDB() {
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

export function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getAllItems(storeName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function getItem(storeName, id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function putItem(storeName, item) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function deleteItem(storeName, id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function clearStore(storeName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function exportBackupJSON() {
  const backup = {
    app: "Nam Hub",
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
  a.download = `NamHub_Backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importBackupJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.data || typeof parsed.data !== "object") {
      throw new Error("Tệp sao lưu không đúng định dạng của Nam Hub.");
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
