/**
 * children.js - Quản lý hồ sơ học tập con cái
 */

import { getAllItems, putItem, deleteItem } from "./storage.js";

export async function getChildrenProfiles() {
  return await getAllItems("children");
}

export async function saveChildProfile(profile) {
  return await putItem("children", profile);
}

export async function removeChildProfile(id) {
  return await deleteItem("children", id);
}
