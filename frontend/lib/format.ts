// "2026-10-28T10:00:00Z" → "28 okt. 2026"
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// 1 → "1 fråga", 4 → "4 frågor"
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}
