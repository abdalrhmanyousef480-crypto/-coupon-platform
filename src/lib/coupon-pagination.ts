/** Keep a small archive directly reachable without growing navigation forever. */
export function couponPaginationPages(page: number, totalPages: number): number[] {
  if (totalPages <= 30) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  // Preserve compact shortcuts for larger archives.
  return Array.from(new Set([
    1, 2, 3,
    Math.ceil(totalPages / 4), Math.ceil(totalPages / 2), Math.ceil(totalPages * 3 / 4),
    page - 1, page, page + 1,
    totalPages - 2, totalPages - 1, totalPages,
  ])).filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
}
