import { OkkRow, RemoveOnlyRow } from './parseSpreadsheet'
import { removeFromDeal, addToDeal, updatePerson, createNote } from './pipedrive'

export interface StepLog {
  ok: boolean
  msg: string
}

export interface PersonResult {
  name: string
  personId: number
  mode: 'transfer' | 'remove_only'
  from: string
  to?: string
  status: 'success' | 'partial' | 'error'
  steps: StepLog[]
}

// ── Transfer (OKK) ────────────────────────────────────────────────────────

export async function processTransfer(row: OkkRow, token: string): Promise<PersonResult> {
  const steps: StepLog[] = []
  let hasError = false
  let wasRemoved = false

  // 1. Remove from old deal
  try {
    const r = await removeFromDeal(row.oldDealId, row.personId, token)
    if (r === 'removed') {
      wasRemoved = true
      steps.push({ ok: true, msg: `Removido do card "${row.oldCompany}" (deal ${row.oldDealId})` })
    } else if (r.startsWith('not_in_deal')) {
      steps.push({ ok: true, msg: `Pessoa já não estava no card "${row.oldCompany}" — ok, continuando` })
    } else {
      steps.push({ ok: false, msg: r })
      hasError = true
    }
  } catch (e: unknown) {
    steps.push({ ok: false, msg: `Erro ao remover do deal antigo: ${e instanceof Error ? e.message : e}` })
    hasError = true
  }

  // 2. Note on old deal — always create
  try {
    const today = new Date().toLocaleDateString('pt-BR')
    const note = `<b>👋 Pessoa removida do card</b><br><br>` +
      `<b>${row.name}</b> mudou de emprego.<br>` +
      `<b>Data:</b> ${today}`
    await createNote(row.oldDealId, note, token)
    steps.push({ ok: true, msg: `Anotação de remoção criada no card "${row.oldCompany}"` })
  } catch (e: unknown) {
    steps.push({ ok: false, msg: `Erro ao criar anotação no deal antigo: ${e instanceof Error ? e.message : e}` })
    hasError = true
  }

  // 3. Update person data
  try {
    await updatePerson(
      row.personId,
      { email: row.email, job_title: row.newTitle || undefined, org_id: row.newOrgId || undefined },
      token
    )
    const emailMsg = row.email ? `e-mail: ${row.email}` : 'e-mail: limpo'
    steps.push({ ok: true, msg: `Dados atualizados — cargo: "${row.newTitle}", ${emailMsg}, org ID: ${row.newOrgId}` })
  } catch (e: unknown) {
    steps.push({ ok: false, msg: `Erro ao atualizar dados da pessoa: ${e instanceof Error ? e.message : e}` })
    hasError = true
  }

  // 4. Add to new deal
  try {
    await addToDeal(row.newDealId, row.personId, token)
    steps.push({ ok: true, msg: `Adicionado ao card "${row.newCompany}" (deal ${row.newDealId})` })
  } catch (e: unknown) {
    steps.push({ ok: false, msg: `Erro ao adicionar ao novo deal: ${e instanceof Error ? e.message : e}` })
    hasError = true
  }

  // 5. Note on new deal
  try {
    const today = new Date().toLocaleDateString('pt-BR')
    const note = buildTransferNote(row, today)
    await createNote(row.newDealId, note, token)
    steps.push({ ok: true, msg: `Anotação criada no card "${row.newCompany}"` })
  } catch (e: unknown) {
    steps.push({ ok: false, msg: `Erro ao criar anotação no deal novo: ${e instanceof Error ? e.message : e}` })
    hasError = true
  }

  return {
    name: row.name,
    personId: row.personId,
    mode: 'transfer',
    from: row.oldCompany,
    to: row.newCompany,
    status: hasError ? (steps.some((s) => s.ok) ? 'partial' : 'error') : 'success',
    steps,
  }
}

// ── Remove only ───────────────────────────────────────────────────────────

export async function processRemoveOnly(row: RemoveOnlyRow, token: string): Promise<PersonResult> {
  const steps: StepLog[] = []
  let hasError = false
  let wasRemoved = false

  // 1. Remove from deal
  try {
    const r = await removeFromDeal(row.oldDealId, row.personId, token)
    if (r === 'removed') {
      wasRemoved = true
      steps.push({ ok: true, msg: `Removido do card "${row.oldCompany}" (deal ${row.oldDealId})` })
    } else if (r.startsWith('not_in_deal')) {
      steps.push({ ok: true, msg: `Pessoa já não estava no card "${row.oldCompany}" — nenhuma ação necessária` })
    } else {
      steps.push({ ok: false, msg: r })
      hasError = true
    }
  } catch (e: unknown) {
    steps.push({ ok: false, msg: `Erro ao remover do deal: ${e instanceof Error ? e.message : e}` })
    hasError = true
  }

  // 2. Note on old deal (only if actually removed)
  if (wasRemoved) {
    try {
      const today = new Date().toLocaleDateString('pt-BR')
      const note = `<b>👋 Pessoa removida do card</b><br><br>` +
        `<b>${row.name}</b> mudou de emprego.<br>` +
        `<b>Data:</b> ${today}`
      await createNote(row.oldDealId, note, token)
      steps.push({ ok: true, msg: `Anotação de remoção criada no card "${row.oldCompany}"` })
    } catch (e: unknown) {
      steps.push({ ok: false, msg: `Erro ao criar anotação: ${e instanceof Error ? e.message : e}` })
      hasError = true
    }
  }

  return {
    name: row.name,
    personId: row.personId,
    mode: 'remove_only',
    from: row.oldCompany,
    status: hasError ? 'error' : 'success',
    steps,
  }
}

// ── Note template (transfer — new deal) ──────────────────────────────────

function buildTransferNote(row: OkkRow, date: string): string {
  return `<b>🔄 Mudança de Emprego Detectada</b><br><br>` +
    `<b>${row.name}</b> mudou de emprego.<br>` +
    `<b>Saiu de:</b> ${row.oldCompany}<br>` +
    `<b>Foi para:</b> ${row.newCompany}<br>` +
    `<b>Novo cargo:</b> ${row.newTitle || '—'}<br>` +
    (row.linkedinUrl ? `<b>LinkedIn:</b> <a href="${row.linkedinUrl}">${row.linkedinUrl}</a><br>` : '') +
    `<b>Data:</b> ${date}`
}
