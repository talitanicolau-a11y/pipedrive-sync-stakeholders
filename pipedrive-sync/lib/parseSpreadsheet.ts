import * as XLSX from 'xlsx'

// ── Types ──────────────────────────────────────────────────────────────────

export interface OkkRow {
  mode: 'transfer'
  name: string
  email: string
  linkedinUrl: string
  oldCompany: string
  newCompany: string
  newTitle: string
  newOrgId: number
  oldDealId: number
  newDealId: number
  personId: number
}

export interface RemoveOnlyRow {
  mode: 'remove_only'
  name: string
  linkedinUrl: string
  oldCompany: string
  oldTitle: string
  oldDealId: number
  personId: number
}

export type PersonRow = OkkRow | RemoveOnlyRow

// ── Parser ─────────────────────────────────────────────────────────────────

function toNum(v: unknown): number {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

function toStr(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

export function parseSpreadsheet(buffer: Buffer): {
  transfer: OkkRow[]
  removeOnly: RemoveOnlyRow[]
} {
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  // ── ABA OKK ──
  const okkSheet = workbook.Sheets['OKK']
  if (!okkSheet) throw new Error('Aba "OKK" não encontrada na planilha.')

  const okkRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(okkSheet, { defval: '' })
  const transfer: OkkRow[] = okkRaw
    .filter((r) => toNum(r['ID Pessoa']) > 0 && toNum(r['ID Negócio Antigo']) > 0)
    .map((r) => ({
      mode: 'transfer',
      name: toStr(r['Name']),
      email: toStr(r['Email']),
      linkedinUrl: toStr(r['Linkedin Url']),
      oldCompany: toStr(r['Old Company']),
      newCompany: toStr(r['New Company']),
      newTitle: toStr(r['New Title']),
      newOrgId: toNum(r['ID Organização Nova']),
      oldDealId: toNum(r['ID Negócio Antigo']),
      newDealId: toNum(r['ID Negócio Novo']),
      personId: toNum(r['ID Pessoa']),
    }))

  // ── ABA Apenas Remover ──
  const removeSheet = workbook.Sheets['Apenas Remover']
  if (!removeSheet) throw new Error('Aba "Apenas Remover" não encontrada na planilha.')

  const removeRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(removeSheet, { defval: '' })
  const removeOnly: RemoveOnlyRow[] = removeRaw
    .filter((r) => toNum(r['ID Pessoa']) > 0 && toNum(r['ID Negócio Antigo']) > 0)
    .map((r) => ({
      mode: 'remove_only',
      name: toStr(r['Name']),
      linkedinUrl: toStr(r['Linkedin Url']),
      oldCompany: toStr(r['Old Company']),
      oldTitle: toStr(r['Old Title']),
      oldDealId: toNum(r['ID Negócio Antigo']),
      personId: toNum(r['ID Pessoa']),
    }))

  return { transfer, removeOnly }
}
