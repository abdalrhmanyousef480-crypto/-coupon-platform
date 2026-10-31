import assert from "node:assert/strict";
import { test, mock } from "node:test";
const nextCache = require("next/cache") as typeof import("next/cache");
import { db } from "../src/lib/db";
import { revalidateCategoriesForStore } from "../src/lib/store-categories";

test("moving a store refreshes the category it left and the one it joined", async () => {
  const paths: string[] = [];
  mock.method(nextCache, "revalidatePath", (path: string) => paths.push(path));
  const originalFindMany = db.storeCategory.findMany;
  db.storeCategory.findMany = (async () => [{ category: { slug: "sport" } }]) as unknown as typeof originalFindMany;
  try {
    await revalidateCategoriesForStore("fixture", ["electronics"]);
    assert.deepEqual(new Set(paths), new Set(["/categories", "/category/electronics", "/category/sport"]));
  } finally { db.storeCategory.findMany = originalFindMany; mock.restoreAll(); }
});

test("unchanged categories are refreshed once and callers without history still work", async () => {
  const paths: string[] = [];
  mock.method(nextCache, "revalidatePath", (path: string) => paths.push(path));
  const originalFindMany = db.storeCategory.findMany;
  db.storeCategory.findMany = (async () => [{ category: { slug: "sport" } }]) as unknown as typeof originalFindMany;
  try {
    await revalidateCategoriesForStore("fixture", ["sport"]);
    assert.deepEqual(paths, ["/categories", "/category/sport"]);
    paths.length = 0;
    await revalidateCategoriesForStore("fixture");
    assert.deepEqual(paths, ["/categories", "/category/sport"]);
  } finally { db.storeCategory.findMany = originalFindMany; mock.restoreAll(); }
});

test("removing the last category still refreshes the previous category page", async () => {
  const paths: string[] = [];
  mock.method(nextCache, "revalidatePath", (path: string) => paths.push(path));
  const originalFindMany = db.storeCategory.findMany;
  db.storeCategory.findMany = (async () => []) as typeof originalFindMany;
  try {
    await revalidateCategoriesForStore("fixture", ["electronics"]);
    assert.deepEqual(paths, ["/categories", "/category/electronics"]);
  } finally { db.storeCategory.findMany = originalFindMany; mock.restoreAll(); }
});
