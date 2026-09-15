/**
 * finance.js - Quản lý các khoản chi tiêu / hóa đơn định kỳ gia đình
 */

import { getAllItems, putItem, deleteItem } from "./storage.js";

export async function getBills() {
  return await getAllItems("bills");
}

export async function saveBill(bill) {
  return await putItem("bills", bill);
}

export async function removeBill(id) {
  return await deleteItem("bills", id);
}

export async function markBillPaid(id) {
  const bills = await getAllItems("bills");
  const b = bills.find(x => x.id === id);
  if (!b) return null;

  const currentMonthStr = getCurrentMonthStr();
  b.lastPaidMonth = currentMonthStr;
  b.status = "paid";
  return await putItem("bills", b);
}

export function getCurrentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatVND(num) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num || 0);
}
