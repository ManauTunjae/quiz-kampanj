import type {
  CampaignSummary,
  CreatedCampaign,
  NewCampaignInput,
  PublicCampaign,
  SubmissionResult,
  SubmittedAnswer,
  LeadInput,
  CampaignStats,
  CampaignDetail,
  UpdateCampaignInput,
  LeadsPage,
  MeResponse,
  RegisterResponse,
  AuthUser,
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
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const method = options.method ?? 'GET'
  let res: Response

  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      // Utan "include" skickar webbläsaren inte admin-cookien till port 8000.
      credentials: 'include',
      // Backend kräver Content-Type på POST, PATCH och DELETE (skydd mot formulär från andra sidor).
      // Därför skickar vi alltid en JSON-body, även ett tomt objekt.
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
export function getMe() {
  return request<MeResponse>('/auth/me')
}

export function login(email: string, password: string) {
  return request<{ ok: true; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export function register(email: string, password: string) {
  return request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: { email, password },
  })
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

// Skickar alla svar. Servern räknar poängen och svarar med resultatet.
export function submitAnswers(slug: string, answers: SubmittedAnswer[]) {
  return request<SubmissionResult>(`/api/campaigns/${encodeURIComponent(slug)}/submissions`, {
    method: 'POST',
    body: { answers },
  })
}

// Sparar namn, e-post och samtycke för en deltagare (efter quizet).
export function saveLead(submissionId: string, input: LeadInput) {
  return request<{ ok: true }>(`/api/submissions/${encodeURIComponent(submissionId)}/lead`, {
    method: 'POST',
    body: input,
  })
}

// ---------- Kampanjer (admin) ----------
export async function listCampaigns(): Promise<CampaignSummary[]> {
  const data = await request<{ campaigns: CampaignSummary[] }>('/api/admin/campaigns')
  return data.campaigns
}

export function getCampaignStats(campaignId: string) {
  return request<CampaignStats>(`/api/admin/campaigns/${encodeURIComponent(campaignId)}/stats`)
}

export function getCampaignLeads(campaignId: string, limit: number, offset: number) {
  return request<LeadsPage>(
    `/api/admin/campaigns/${encodeURIComponent(campaignId)}/leads?limit=${limit}&offset=${offset}`
  )
}

export function createCampaign(input: NewCampaignInput) {
  return request<CreatedCampaign>('/api/admin/campaigns', { method: 'POST', body: input })
}

// ---------- Ändra och pausa (admin) ----------
export async function getCampaignDetail(campaignId: string): Promise<CampaignDetail> {
  const data = await request<{ campaign: CampaignDetail }>(
    `/api/admin/campaigns/${encodeURIComponent(campaignId)}`
  )
  return data.campaign
}

// Ändrar titel, färg, texter eller pausar. Skicka bara det som ska ändras.
export async function updateCampaign(campaignId: string, input: UpdateCampaignInput): Promise<CampaignDetail> {
  const data = await request<{ campaign: CampaignDetail }>(
    `/api/admin/campaigns/${encodeURIComponent(campaignId)}`,
    { method: 'PATCH', body: input }
  )
  return data.campaign
}

// ---------- Radera (admin) ----------
// Raderar en persons namn och e-post. Deltagaren och svaren finns kvar.
export function deleteLead(campaignId: string, leadId: string) {
  return request<{ ok: true }>(
    `/api/admin/campaigns/${encodeURIComponent(campaignId)}/leads/${encodeURIComponent(leadId)}`,
    { method: 'DELETE' }
  )
}

// Raderar kampanjen och allt som hör till den (frågor, deltagare, leads).
export function deleteCampaign(campaignId: string) {
  return request<{ ok: true }>(`/api/admin/campaigns/${encodeURIComponent(campaignId)}`, {
    method: 'DELETE',
  })
}

// ---------- Exportera leads till CSV (admin) ----------
// Filen är inte JSON, så vi hämtar den själva och sparar den via en tillfällig länk.
// Cookien skickas med (credentials: 'include'). Filnamnet kommer från backend.
export async function downloadLeadsCsv(campaignId: string): Promise<string> {
  let res: Response
  try {
    res = await fetch(`${API_URL}/api/admin/campaigns/${encodeURIComponent(campaignId)}/leads.csv`, {
      credentials: 'include',
    })
  } catch {
    throw new ApiError(0, 'Kan inte nå servern. Kör backend på port 8000?')
  }

  if (!res.ok) {
    let message = 'Något gick fel'
    try {
      message = ((await res.json()) as { error?: string }).error ?? message
    } catch {
      // svaret var inte JSON
    }
    throw new ApiError(res.status, message)
  }

  const blob = await res.blob()
  const filename = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'leads.csv'

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return filename
}
