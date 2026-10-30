// "Höstquiz för Naturen!" → "hostquiz-for-naturen"
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // tar bort prickar och ringar (å → a, ö → o)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '')
  return slug || 'kampanj'
}
