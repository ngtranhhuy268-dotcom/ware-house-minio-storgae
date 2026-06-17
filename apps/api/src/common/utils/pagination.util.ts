export function normalizePagination(page?: number, pageSize?: number) {
  const safePage = page && page > 0 ? page : 1;
  const safePageSize =
    pageSize && [25, 50, 100].includes(pageSize) ? pageSize : 25;

  return {
    page: safePage,
    pageSize: safePageSize,
    skip: (safePage - 1) * safePageSize,
    take: safePageSize,
  };
}
