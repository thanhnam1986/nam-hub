/**
 * parser.js - Bộ phân tích ngôn ngữ tự nhiên (NLP) tiếng Việt
 */

import { getTodayStr } from "./storage.js";

export function parseNaturalTask(rawText) {
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
  } else if (lower.includes("bông") || lower.includes("bong") || lower.includes("bé bông") || lower.includes("con gái")) {
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
