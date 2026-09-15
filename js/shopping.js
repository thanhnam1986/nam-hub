/**
 * shopping.js - Quản lý danh sách mua sắm gia đình
 */

import { getAllItems, putItem, deleteItem } from "./storage.js";

export async function getShoppingList() {
  const items = await getAllItems("shopping");
  return items.sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1));
}

export async function addShoppingItem(name, category = "Gia đình") {
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

export async function toggleShoppingItem(id) {
  const items = await getAllItems("shopping");
  const found = items.find(i => i.id === id);
  if (!found) return null;
  found.checked = !found.checked;
  return await putItem("shopping", found);
}

export async function clearCheckedShopping() {
  const items = await getAllItems("shopping");
  for (const item of items) {
    if (item.checked) {
      await deleteItem("shopping", item.id);
    }
  }
}
