import assert from "node:assert/strict";
import { test } from "node:test";
import { currentYearSeoTitle } from "../src/lib/seo";

test("standalone saved SEO title years refresh to the runtime year", () => {
  const year = String(new Date().getFullYear());
  assert.equal(currentYearSeoTitle("كود خصم متجر 2025 | كوبون نور"), `كود خصم متجر ${year} | كوبون نور`);
  assert.equal(currentYearSeoTitle("(2024) / 2027"), `(${year}) / ${year}`);
});

test("year-like digits inside Arabic, Latin or numeric identifiers stay intact", () => {
  for (const value of ["SAVE2025", "2025SAVE", "متجر2025", "2025متجر", "120250", "٢٠٢٥"]) {
    assert.equal(currentYearSeoTitle(value), value);
  }
});

test("titles without a standalone year only normalize whitespace", () => {
  assert.equal(currentYearSeoTitle("  كوبون   متجر ABBBA1  "), "كوبون متجر ABBBA1");
});
