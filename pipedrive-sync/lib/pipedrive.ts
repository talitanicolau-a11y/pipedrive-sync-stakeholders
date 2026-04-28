const BASE = 'https://api.pipedrive.com/v1'

// ── Generic request ────────────────────────────────────────────────────────

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
  // 404 on DELETE is fine (already removed) — caller handles
  if (!res.ok && res.status !== 404) {
    throw new Error(json?.error || `Pipedrive ${res.status} ${path}`)
  }
  return json
}

// ── Participants ───────────────────────────────────────────────────────────

interface Participant {
  id: number
  person_id: number
}

async function getDealParticipants(dealId: number, token: string): Promise<Participant[]> {
  const json = (await pd(`/deals/${dealId}/participants?limit=500`, 'GET', token)) as {
    data?: Participant[]
  }
  return json?.data ?? []
}

/**
 * Removes a person from a deal.
 * Returns 'removed' | 'not_in_deal' | 'deal_not_found'
 */
export async function removeFromDeal(
  dealId: number,
  personId: number,
  token: string
): Promise<'removed' | 'not_in_deal' | 'deal_not_found'> {
  let participants: Participant[]
  try {
    participants = await getDealParticipants(dealId, token)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('404')) return 'deal_not_found'
    throw e
  }

  const p = participants.find((x) => x.person_id === personId)
  if (!p) return 'not_in_deal'

  await pd(`/deals/${dealId}/participants/${p.id}`, 'DELETE', token)
  return 'removed'
}

// ── Add to deal ────────────────────────────────────────────────────────────

export async function addToDeal(dealId: number, personId: number, token: string): Promise<void> {
  await pd(`/deals/${dealId}/participants`, 'POST', token, { person_id: personId })
}

// ── Update person ──────────────────────────────────────────────────────────

export async function updatePerson(
  personId: number,
  fields: {
    email?: string
    job_title?: string
    org_id?: number
  },
  token: string
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (fields.email) payload.email = [{ value: fields.email, primary: true, label: 'work' }]
  if (fields.job_title) payload.job_title = fields.job_title
  if (fields.org_id) payload.org_id = fields.org_id
  if (Object.keys(payload).length === 0) return
  await pd(`/persons/${personId}`, 'PUT', token, payload)
}

// ── Note on deal ───────────────────────────────────────────────────────────

export async function createNote(dealId: number, html: string, token: string): Promise<void> {
  await pd('/notes', 'POST', token, {
    deal_id: dealId,
    content: html,
    pinned_to_deal_flag: 1,
  })
}
