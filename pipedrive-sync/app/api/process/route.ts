import { NextRequest, NextResponse } from 'next/server'
import { parseSpreadsheet } from '@/lib/parseSpreadsheet'
import { processTransfer, processRemoveOnly, PersonResult } from '@/lib/processor'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const token = (formData.get('api_token') as string | null)?.trim()

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    if (!token || token.length < 10) return NextResponse.json({ error: 'API Token inválido.' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    let parsed: Awaited<ReturnType<typeof parseSpreadsheet>>
    try {
      parsed = parseSpreadsheet(buffer)
    } catch (e: unknown) {
      return NextResponse.json({ error: `Erro ao ler planilha: ${e instanceof Error ? e.message : e}` }, { status: 400 })
    }

    const { transfer, removeOnly } = parsed
    if (transfer.length === 0 && removeOnly.length === 0) {
      return NextResponse.json({ error: 'Nenhuma linha válida encontrada nas duas abas.' }, { status: 400 })
    }

    const results: PersonResult[] = []

    // Process transfers (OKK)
    for (const row of transfer) {
      const result = await processTransfer(row, token)
      results.push(result)
      await sleep(250) // respect Pipedrive rate limit
    }

    // Process remove-only
    for (const row of removeOnly) {
      const result = await processRemoveOnly(row, token)
      results.push(result)
      await sleep(150)
    }

    const summary = {
      total: results.length,
      transfer: transfer.length,
      removeOnly: removeOnly.length,
      success: results.filter((r) => r.status === 'success').length,
      partial: results.filter((r) => r.status === 'partial').length,
      error: results.filter((r) => r.status === 'error').length,
    }

    return NextResponse.json({ summary, results })
  } catch (e: unknown) {
    return NextResponse.json({ error: `Erro interno: ${e instanceof Error ? e.message : e}` }, { status: 500 })
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
