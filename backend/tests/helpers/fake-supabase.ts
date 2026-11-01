// En låtsas-Supabase för tester. Den låter koden kedja anrop som i verkligheten
// (from(...).select(...).eq(...).maybeSingle()) men pratar aldrig med internet.
// Testet bestämmer vad varje tabell ska svara, och kan sedan titta på vilka anrop som gjordes.

export type Call = { table: string; method: string; args: unknown[] }
type Reply = { data?: unknown; error?: { message: string } | null }
type Responder = (call: { table: string; calls: Call[] }) => Reply

export function createFakeSupabase(responder: Responder) {
  const log: Call[] = []

  function builder(table: string) {
    const mine: Call[] = []
    const b: Record<string, unknown> = {}
    const chain = (method: string) => (...args: unknown[]) => {
      const call = { table, method, args }
      mine.push(call)
      log.push(call)
      return b
    }
    for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'range', 'limit']) b[m] = chain(m)
    const finish = () => {
      const r = responder({ table, calls: mine })
      return { data: r.data ?? null, error: r.error ?? null }
    }
    b.maybeSingle = async () => finish()
    b.single = async () => finish()
    // Gör att man kan skriva "await supabase.from(...).insert(...)"
    b.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(finish()).then(resolve, reject)
    return b
  }

  return { client: { from: (table: string) => builder(table) }, log }
}
