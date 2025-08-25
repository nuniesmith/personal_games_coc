// Lightweight pagination helper to keep consistent envelope structure.
// Usage: const { slice, page, pageSize, total, totalPages } = paginate(array, req.query.page, req.query.pageSize)
// Return payload shape: { data: slice, page, pageSize, total, totalPages, hasNext, hasPrev }

export function paginate(list = [], pageRaw, sizeRaw, { maxPageSize = 100, defaultPageSize = 25 } = {}) {
  const total = Array.isArray(list) ? list.length : 0;
  let pageSize = parseInt(sizeRaw, 10) || defaultPageSize;
  pageSize = Math.min(Math.max(pageSize, 1), maxPageSize);
  let page = parseInt(pageRaw, 10) || 1;
  page = Math.max(page, 1);
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
  if (page > totalPages) page = totalPages; // clamp
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const slice = list.slice(start, end);
  return {
    data: slice,
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

// Helper to wrap an existing payload without re-slicing (e.g., upstream already paginated)
export function paginationEnvelope({ data, page = 1, pageSize, total }) {
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
  return { data, page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}
