/**
 * family.js - Quản lý thành viên gia đình
 */

import { getAllItems, putItem, deleteItem } from "./storage.js";

export async function getMembers() {
  const list = await getAllItems("members");
  return list.sort((a, b) => (a.order || 99) - (b.order || 99));
}

export async function saveMember(member) {
  return await putItem("members", member);
}

export async function removeMember(id) {
  return await deleteItem("members", id);
}
