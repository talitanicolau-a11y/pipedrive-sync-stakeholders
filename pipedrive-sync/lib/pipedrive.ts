const BASE = 'https://api.pipedrive.com/v1'

async function pd(
  path: string,
  method: string,
  token: string,
  body?: object
): Promise<unknown> {
  const sep = path.includes('?') ? '&' : '?'
  const url = `${BASE}${path}${sep}api_token=${token}`
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(json?.error || `Pipedrive ${res.status} ${path}`)
  }
  return json
}

// Participant as returned by Pipedrive API — person_id is a nested object
interface RawParticipant {
  id: number
  person_id: number | { value: number } | null
}

interface DealData {
  id: number
  person_id?: { value: number } | null
}

function extractPersonId(raw: RawParticipant): number | null {
  if (raw.person_id == null) return null
  if (typeof raw.person_id === 'object') return Number(raw.person_id.value)
  return Number(raw.person_id)
}

async function getDealParticipants(dealId: number, token: string): Promise<RawParticipant[]> {
  const json = (await pd(`/deals/${dealId}/participants?limit=500`, 'GET', token)) as {
    data?: RawParticipant[]
    success?: boolean
  }
  if (!json || !(json as { success?: boolean }).success) return []
  return (json as { data?: RawParticipant[] }).data ?? []
}

async function getDeal(dealId: number, token: string): Promise<DealData | null> {
  const json = (await pd(`/deals/${dealId}`, 'GET', token)) as {
    data?: DealData
    success?: boolean
  }
  if (!json || !(json as { success?: boolean }).success) return null
  return (json as { data?: DealData }).data ?? null
}

export async function removeFromDeal(
  dealId: number,
  personId: number,
  token: string
): Promise<'removed' | string> {
  let deal: DealData | null
  let participants: RawParticipant[]

  ;[deal, participants] = await Promise.all([
    getDeal(dealId, token),
    getDealParticipants(dealId, token),
  ])

  if (!deal) {
    return `deal_not_found — deal ${dealId} não retornou dados válidos`
  }

  const pid = Number(personId)
  let found = false

  // 1. Remove from participants list (person_id can be number or {value: number})
  const participant = participants.find((x) => extractPersonId(x) === pid)
  if (participant) {
    found = true
    await pd(`/deals/${dealId}/participants/${participant.id}`, 'DELETE', token)
  }

  // 2. Remove as primary contact if matches
  const primaryId = deal.person_id?.value != null ? Number(deal.person_id.value) : null
  if (primaryId === pid) {
    found = true
    await pd(`/deals/${dealId}`, 'PATCH', token, { person_id: null })
  }

  if (!found) {
    const participantIds = participants.map((x) => extractPersonId(x))
    return `not_in_deal — buscado: ${pid} | participantes: [${participantIds.join(', ') || 'nenhum'}] | principal: ${primaryId ?? 'nenhum'}`
  }

  return 'removed'
}

export async function addToDeal(dealId: number, personId: number, token: string): Promise<void> {
  await pd(`/deals/${dealId}/participants`, 'POST', token, { person_id: personId })
}

export async function updatePerson(
  personId: number,
  fields: { email: string; job_title?: string; org_id?: number },
  token: string
): Promise<void> {
  const payload: Record<string, unknown> = {
    email: fields.email
      ? [{ value: fields.email, primary: true, label: 'work' }]
      : [],
  }
  if (fields.job_title) payload.job_title = fields.job_title
  if (fields.org_id) payload.org_id = fields.org_id
  await pd(`/persons/${personId}`, 'PUT', token, payload)
}

export async function createNote(dealId: number, html: string, token: string): Promise<void> {
  await pd('/notes', 'POST', token, {
    deal_id: dealId,
    content: html,
    pinned_to_deal_flag: 1,
  })
}
