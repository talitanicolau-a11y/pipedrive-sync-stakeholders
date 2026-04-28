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
  if (!res.ok && res.status !== 404) {
    throw new Error(json?.error || `Pipedrive ${res.status} ${path}`)
  }
  return json
}

interface Participant { id: number; person_id: number }
interface DealData { id: number; person_id?: { value: number } | null }

async function getDealParticipants(dealId: number, token: string): Promise<Participant[]> {
  const json = (await pd(`/deals/${dealId}/participants?limit=500`, 'GET', token)) as { data?: Participant[] }
  return json?.data ?? []
}

async function getDeal(dealId: number, token: string): Promise<DealData | null> {
  const json = (await pd(`/deals/${dealId}`, 'GET', token)) as { data?: DealData }
  return json?.data ?? null
}

export async function removeFromDeal(
  dealId: number,
  personId: number,
  token: string
): Promise<'removed' | 'not_in_deal' | 'deal_not_found' | string> {
  let deal: DealData | null
  let participants: Participant[]

  try {
    ;[deal, participants] = await Promise.all([
      getDeal(dealId, token),
      getDealParticipants(dealId, token),
    ])
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('404')) return 'deal_not_found'
    throw e
  }

  if (!deal) return 'deal_not_found'

  // Force both sides to number for safe comparison
  const pid = Number(personId)
  let found = false

  // 1. Remove from participants list
  const participant = participants.find((x) => Number(x.person_id) === pid)
  if (participant) {
    found = true
    await pd(`/deals/${dealId}/participants/${participant.id}`, 'DELETE', token)
  }

  // 2. Remove as primary contact
  const primaryId = deal.person_id?.value != null ? Number(deal.person_id.value) : null
  if (primaryId === pid) {
    found = true
    await pd(`/deals/${dealId}`, 'PATCH', token, { person_id: null })
  }

  // Debug info returned in the 'not_in_deal' case so it shows in the UI
  if (!found) {
    const participantIds = participants.map((x) => Number(x.person_id))
    return `not_in_deal — buscado: ${pid}, participantes no deal: [${participantIds.join(', ')}], contato principal: ${primaryId}`
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
