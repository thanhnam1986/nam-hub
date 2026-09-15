/**
 * tasks.js - Quản lý công việc & tự động sinh task lặp lại
 */

import { getAllItems, getItem, putItem, deleteItem, getTodayStr } from "./storage.js";

export async function getTasks() {
  return await getAllItems("tasks");
}

export async function saveTask(task) {
  return await putItem("tasks", task);
}

export async function removeTask(taskId) {
  return await deleteItem("tasks", taskId);
}

export async function toggleTaskComplete(taskId) {
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

export function calculateNextDueDate(dateStr, recurringType) {
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

export function filterTodayTasks(allTasks) {
  const today = getTodayStr();
  return allTasks.filter(t => !t.completed && (t.dueDate <= today || !t.dueDate));
}

export function filterImportantTasks(allTasks) {
  const today = getTodayStr();
  return allTasks.filter(t => !t.completed && (t.priority === "high" || t.dueDate < today));
}
