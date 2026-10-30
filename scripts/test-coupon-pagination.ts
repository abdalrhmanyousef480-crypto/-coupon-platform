import assert from "node:assert/strict";
import { test } from "node:test";
import { couponPaginationPages } from "../src/lib/coupon-pagination";

test("every page in the current archive is within three clicks of the homepage", () => {
  // Homepage -> /coupons -> a numbered page. Audit all potential destinations,
  // including the five pages Semrush reported at depths four or five.
  for (const total of [1, 22, 30]) {
    const distances = new Map([[1, 1]]);
    const queue = [1];
    for (const current of queue) {
      for (const next of couponPaginationPages(current, total)) {
        if (next !== current && !distances.has(next)) {
          distances.set(next, distances.get(current)! + 1);
          queue.push(next);
        }
      }
    }
    assert.equal(distances.size, total);
    assert.ok([...distances.values()].every((clicks) => clicks <= 3));
  }
});

test("large archives keep navigation bounded with valid ordered unique destinations", () => {
  for (const total of [31, 100, 1000]) {
    for (const current of [1, Math.ceil(total / 2), total]) {
      const pages = couponPaginationPages(current, total);
      assert.ok(pages.length <= 12);
      assert.ok(pages.includes(1) && pages.includes(total) && pages.includes(current));
      assert.equal(new Set(pages).size, pages.length);
      assert.ok(pages.every((page, i) => page >= 1 && page <= total && (i === 0 || page > pages[i - 1])));
      if (current > 1) assert.ok(pages.includes(current - 1));
      if (current < total) assert.ok(pages.includes(current + 1));
    }
  }
});
