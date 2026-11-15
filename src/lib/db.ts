import type { Category, Settings, Transaction } from "./types";

/**
 * Storage in IndexedDB, so data stays on the device, survives reloads and works offline.
 * Every write is a transaction that either completes or leaves the data unchanged.
 */

const DB_NAME = "budget-tracker";
const DB_VERSION = 1;

type StoreName = "transactions" | "categories" | "settings";

let opening: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const transactions = db.createObjectStore("transactions", { keyPath: "id" });
      transactions.createIndex("date", "date");
      db.createObjectStore("categories", { keyPath: "id" });
      db.createObjectStore("settings");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      opening = null;
      reject(request.error);
    };
  });
  return opening;
}

/** Closes the connection and forgets it. Used by tests to start from a fresh database. */
export async function resetDatabaseForTests(): Promise<void> {
  if (opening) (await opening).close();
  opening = null;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function write(stores: StoreName[], apply: (tx: IDBTransaction) => void): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(stores, "readwrite");
  apply(tx);
  await done(tx);
}

export const loadTransactions = () => getAll<Transaction>("transactions");
export const loadCategories = () => getAll<Category>("categories");

export async function loadSettings(): Promise<Settings | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction("settings").objectStore("settings").get("settings");
    request.onsuccess = () => resolve((request.result as Settings | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export const saveSettings = (settings: Settings) =>
  write(["settings"], (tx) => tx.objectStore("settings").put(settings, "settings"));

export const saveTransaction = (transaction: Transaction) =>
  write(["transactions"], (tx) => tx.objectStore("transactions").put(transaction));

export const deleteTransaction = (id: string) =>
  write(["transactions"], (tx) => tx.objectStore("transactions").delete(id));

export const saveCategory = (category: Category) =>
  write(["categories"], (tx) => tx.objectStore("categories").put(category));

/** Adds categories and transactions together: an import is stored completely or not at all. */
export const saveImport = (categories: Category[], transactions: Transaction[]) =>
  write(["categories", "transactions"], (tx) => {
    for (const category of categories) tx.objectStore("categories").put(category);
    for (const transaction of transactions) tx.objectStore("transactions").put(transaction);
  });
