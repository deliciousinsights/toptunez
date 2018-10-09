export function getPageDescriptors({ page, pageSize, totalCount }) {
  const result = {}
  const maxPage = Math.ceil(totalCount / pageSize)

  if (page > 1) {
    result.first = { page: 1, pageSize }
    result.prev = { page: page - 1, pageSize }
  }
  if (page < maxPage) {
    result.last = { page: maxPage, pageSize }
    result.next = { page: Number(page) + 1, pageSize }
  }

  return result
}
