/**
 * calendar.js - Lịch tuần trực quan cho cả gia đình
 */

import { getTodayStr } from "./storage.js";

export function getWeekDays(referenceDate = new Date()) {
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
