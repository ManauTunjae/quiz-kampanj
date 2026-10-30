import type {
  CampaignSummary,
  CreatedCampaign,
  NewCampaignInput,
  PublicCampaign,
} from './types'

// Alla anrop till backend går via den här filen.
// Frontend pratar ALDRIG direkt med Supabase.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export type ApiIssue = { path: string; message: string }

export class ApiError extends Error {
  status: number
  issues: ApiIssue[]

  constructor(status: number, message: string, issues: ApiIssue[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status // 0 = vi kom inte åt servern
    this.issues = issues
  }
}

async function request<T>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown } = {}
): Promise<T> {
  const method = options.method ?? 'GET'
  let res: Response

  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      // Utan "include" skickar webbläsaren inte admin-cookien till port 8000.
      credentials: 'include',
      // Backend kräver Content-Type på POST (skydd mot formulär från andra sidor).
      // Därför skickar vi alltid en JSON-body på POST, även ett tomt objekt.
      headers: method === 'GET' ? undefined : { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(options.body ?? {}),
    })
  } catch {
    throw new ApiError(0, 'Kan inte nå servern. Kör backend på port 8000?')
  }

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // tomt eller ogiltigt svar
  }

  if (!res.ok) {
    const body = (data ?? {}) as { error?: string; issues?: ApiIssue[] }
    throw new ApiError(res.status, body.error ?? 'Något gick fel', body.issues ?? [])
  }
  return data as T
}

// ---------- Inloggning ----------
export async function getMe(): Promise<boolean> {
  const data = await request<{ loggedIn: boolean }>('/auth/me')
  return data.loggedIn
}

export function login(password: string) {
  return request<{ ok: true }>('/auth/login', { method: 'POST', body: { password } })
}

export function logout() {
  return request<{ ok: true }>('/auth/logout', { method: 'POST' })
}

// ---------- Publik quiz (ingen inloggning) ----------
export async function getPublicCampaign(slug: string): Promise<PublicCampaign> {
  const data = await request<{ campaign: PublicCampaign }>(
    `/api/campaigns/${encodeURIComponent(slug)}`
  )
  return data.campaign
}

// ---------- Kampanjer (admin) ----------
export async function listCampaigns(): Promise<CampaignSummary[]> {
  const data = await request<{ campaigns: CampaignSummary[] }>('/api/admin/campaigns')
  return data.campaigns
}

export function createCampaign(input: NewCampaignInput) {
  return request<CreatedCampaign>('/api/admin/campaigns', { method: 'POST', body: input })
}
