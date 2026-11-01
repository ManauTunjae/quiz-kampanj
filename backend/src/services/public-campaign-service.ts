import { supabase } from '../database/supabase.js'

// Kampanjen som besökaren ser. Publik: kräver ingen inloggning.
//
// VIKTIGT: Vi hämtar ALDRIG kolumnen "is_correct" här, och vi bygger svaret
// fält för fält. Då kan rätt svar aldrig läcka till besökaren.
// Poängen räknas på servern i en senare feature.

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position

// Returnerar null om kampanjen inte finns, { paused: true, title } om den är pausad.
export async function getPublicCampaign(slug: string) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, slug, title, accent_color, is_active, questions(id, position, text, options(id, position, text))')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(`Kunde inte hämta kampanj: ${error.message}`)
  if (!data) return null // finns inte
  if (data.is_active === false) return { paused: true as const, title: data.title } // pausad: inga frågor skickas

  return {
    paused: false as const,
    id: data.id,
    slug: data.slug,
    title: data.title,
    accentColor: data.accent_color,
    // Databasen garanterar inte ordningen, så vi sorterar själva på position.
    questions: [...(data.questions ?? [])].sort(byPosition).map((q) => ({
      id: q.id,
      text: q.text,
      options: [...(q.options ?? [])].sort(byPosition).map((o) => ({
        id: o.id,
        text: o.text,
      })),
    })),
  }
}
