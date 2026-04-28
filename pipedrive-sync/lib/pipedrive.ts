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

interface DealData {
  id: number
  person_id?: { value: number } | null
}

async function getDeal(dealId: number, token: string): Promise<DealData | null> {
  const json = (await pd(`/deals/${dealId}`, 'GET', token)) as { data?: DealData; success?: boolean }
  if (!json || !(json as { success?: boolean }).success) return null
  return (json as { data?: DealData }).data ?? null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDealParticipantsRaw(dealId: number, token: string): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = (await pd(`/deals/${dealId}/participants?limit=500`, 'GET', token)) as any
  if (!json?.success) return []
  return json.data ?? []
}

export async function removeFromDeal(
  dealId: number,
  personId: number,
  token: string
): Promise<'removed' | string> {
  const [deal, participants] = await Promise.all([
    getDeal(dealId, token),
    getDealParticipantsRaw(dealId, token),
  ])

  if (!deal) return `deal_not_found — deal ${dealId} não retornou dados válidos`

  const pid = Number(personId)

  // Show raw structure of first participant to debug
  const rawSample = participants[0] ? JSON.stringify(participants[0]).slice(0, 300) : 'lista vazia'

  // Try every possible location the person id might be
  const participant = participants.find((x) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = x as any
    return (
      Number(p.person_id) === pid ||
      Number(p.person_id?.value) === pid ||
      Number(p.person?.id) === pid ||
      Number(p.id) === pid
    )
  })

  let found = false

  if (participant) {
    found = true
    await pd(`/deals/${dealId}/participants/${participant.id}`, 'DELETE', token)
  }

  const primaryId = deal.person_id?.value != null ? Number(deal.person_id.value) : null
  if (primaryId === pid) {
    found = true
    await pd(`/deals/${dealId}`, 'PATCH', token, { person_id: null })
  }

  if (!found) {
    return `not_in_deal — buscado: ${pid} | principal: ${primaryId ?? 'nenhum'} | estrutura do 1º participante: ${rawSample}`
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
