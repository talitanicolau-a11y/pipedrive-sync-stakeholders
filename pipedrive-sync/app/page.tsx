'use client'

import { useState, useRef, useCallback } from 'react'

interface StepLog { ok: boolean; msg: string }
interface PersonResult {
  name: string; personId: number; mode: 'transfer' | 'remove_only'
  from: string; to?: string; status: 'success' | 'partial' | 'error'; steps: StepLog[]
}
interface Summary {
  total: number; transfer: number; removeOnly: number
  success: number; partial: number; error: number
}
interface ApiResponse { summary?: Summary; results?: PersonResult[]; error?: string }

const S = {
  page: { maxWidth: 780, margin: '0 auto', padding: '2.5rem 1.25rem 4rem' } as React.CSSProperties,

  card: (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 14, ...extra,
  }),

  label: { fontSize: '0.68rem', letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'var(--sub)', marginBottom: 6, display: 'block' },

  input: {
    width: '100%', background: 'var(--card2)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '0.7rem 1rem', color: 'var(--text)',
    fontSize: '0.85rem', outline: 'none', transition: 'border-color 0.15s',
  } as React.CSSProperties,

  btn: (disabled: boolean): React.CSSProperties => ({
    width: '100%', padding: '0.9rem', borderRadius: 10,
    background: disabled ? 'var(--card2)' : 'var(--accent)',
    border: 'none', color: disabled ? 'var(--sub)' : '#fff',
    fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.04em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--display)',
    boxShadow: disabled ? 'none' : '0 0 28px var(--accent-glow)',
    transition: 'all 0.2s',
  }),
}

function statusColor(s: PersonResult['status']) {
  return s === 'success' ? 'var(--green)' : s === 'partial' ? 'var(--yellow)' : 'var(--red)'
}
function statusLabel(s: PersonResult['status']) {
  return s === 'success' ? 'SUCESSO' : s === 'partial' ? 'PARCIAL' : 'ERRO'
}
function modeLabel(m: PersonResult['mode']) {
  return m === 'transfer' ? 'transferência' : 'só remoção'
}

export default function Home() {
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'transfer' | 'remove_only' | 'error'>('all')
  const fileRef = useRef<HTMLInputElement>(null)

  const acceptFile = (f: File) => {
    const ok = f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    if (ok) { setFile(f); setResponse(null); setExpanded(null) }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files[0]) acceptFile(e.dataTransfer.files[0])
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) acceptFile(e.target.files[0])
  }

  const submit = async () => {
    if (!file || !token.trim() || loading) return
    setLoading(true); setResponse(null); setExpanded(null); setFilter('all')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('api_token', token.trim())
    try {
      const res = await fetch('/api/process', { method: 'POST', body: fd })
      setResponse(await res.json())
    } catch {
      setResponse({ error: 'Falha de conexão com o servidor.' })
    } finally {
      setLoading(false)
    }
  }

  const filteredResults = response?.results?.filter((r) => {
    if (filter === 'all') return true
    if (filter === 'error') return r.status !== 'success'
    return r.mode === filter
  }) ?? []

  return (
    <main style={S.page}>

      {/* ── Header ── */}
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)',
            boxShadow: '0 0 12px var(--accent)', display: 'inline-block'
          }} />
          <span style={{ color: 'var(--sub)', fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Pipedrive Automação
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(1.75rem,5vw,2.8rem)', fontWeight: 800, lineHeight: 1.1 }}>
          Mudanças de<br /><span style={{ color: 'var(--accent)' }}>Emprego</span>
        </h1>
        <p style={{ color: 'var(--sub)', marginTop: 10, fontSize: '0.88rem', lineHeight: 1.7 }}>
          Suba a planilha com as abas <b style={{ color: 'var(--text)' }}>OKK</b> e{' '}
          <b style={{ color: 'var(--text)' }}>Apenas Remover</b>.<br />
          O sistema executa todas as alterações no Pipedrive automaticamente.
        </p>
      </header>

      {/* ── Token ── */}
      <div style={{ ...S.card({ padding: '1.25rem', marginBottom: '1rem' }) }}>
        <label style={S.label}>API Token do Pipedrive</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Cole seu token aqui..."
            style={{ ...S.input, paddingRight: '2.8rem' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          <button onClick={() => setShowToken(!showToken)} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sub)', fontSize: 16
          }}>
            {showToken ? '🙈' : '👁️'}
          </button>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--sub)', marginTop: 6 }}>
          Pipedrive → Configurações → Pessoal → API
        </p>
      </div>

      {/* ── File drop ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !file && fileRef.current?.click()}
        style={{
          ...S.card({
            padding: '2rem', marginBottom: '1rem', textAlign: 'center',
            cursor: file ? 'default' : 'pointer',
            border: `2px dashed ${dragging ? 'var(--accent)' : file ? 'var(--green)' : 'var(--border)'}`,
            background: dragging ? 'rgba(124,108,252,0.05)' : 'var(--card)',
            transition: 'all 0.2s',
          })
        }}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onFileChange} style={{ display: 'none' }} />
        {file ? (
          <>
            <div style={{ fontSize: '2rem' }}>📊</div>
            <p style={{ color: 'var(--green)', fontWeight: 600, marginTop: 6 }}>{file.name}</p>
            <p style={{ color: 'var(--sub)', fontSize: '0.78rem', marginTop: 2 }}>
              {(file.size / 1024).toFixed(1)} KB
            </p>
            <button onClick={(e) => { e.stopPropagation(); setFile(null); setResponse(null) }}
              style={{
                marginTop: 10, background: 'none', border: '1px solid var(--border)',
                borderRadius: 6, padding: '0.2rem 0.7rem', color: 'var(--sub)',
                cursor: 'pointer', fontSize: '0.72rem'
              }}>
              trocar arquivo
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '2rem' }}>📁</div>
            <p style={{ marginTop: 8, fontSize: '0.9rem' }}>Arraste ou clique para selecionar</p>
            <p style={{ color: 'var(--sub)', fontSize: '0.75rem', marginTop: 4 }}>
              Requer abas <code>OKK</code> e <code>Apenas Remover</code> · .xlsx
            </p>
          </>
        )}
      </div>

      {/* ── Submit ── */}
      <button
        onClick={submit}
        disabled={!file || !token.trim() || loading}
        style={{ ...S.btn(!file || !token.trim() || loading), marginBottom: '2rem' }}
      >
        {loading ? '⏳  Processando...' : '🚀  Sincronizar no Pipedrive'}
      </button>

      {/* ── Loading bar ── */}
      {loading && (
        <div style={{ ...S.card({ padding: '1.25rem', marginBottom: '1rem', textAlign: 'center', animation: 'fadeIn 0.3s' }) }}>
          <p style={{ color: 'var(--accent)', marginBottom: 4 }}>Executando mudanças no Pipedrive…</p>
          <p style={{ color: 'var(--sub)', fontSize: '0.78rem' }}>
            Pode levar alguns minutos para 200+ registros.
          </p>
          <div style={{ background: 'var(--card2)', borderRadius: 4, height: 3, marginTop: 12, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: '35%', background: 'var(--accent)', borderRadius: 4,
              backgroundImage: 'linear-gradient(90deg, var(--accent), #b0a4ff, var(--accent))',
              backgroundSize: '200% auto', animation: 'shimmer 1.4s linear infinite',
            }} />
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {response?.error && (
        <div style={{
          ...S.card({ padding: '1.1rem 1.25rem', marginBottom: '1rem', borderColor: 'rgba(240,96,96,0.3)', animation: 'fadeIn 0.3s' })
        }}>
          <p style={{ color: 'var(--red)' }}>❌ {response.error}</p>
        </div>
      )}

      {/* ── Results ── */}
      {response?.summary && (
        <div style={{ animation: 'fadeIn 0.4s' }}>

          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Total', val: response.summary.total, color: 'var(--accent)' },
              { label: 'Sucesso', val: response.summary.success, color: 'var(--green)' },
              { label: 'Com erro', val: response.summary.error + response.summary.partial, color: 'var(--red)' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ ...S.card({ padding: '1rem', textAlign: 'center' }) }}>
                <div style={{ fontSize: '2rem', fontFamily: 'var(--display)', fontWeight: 800, color }}>{val}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Mode breakdown */}
          <p style={{ color: 'var(--sub)', fontSize: '0.78rem', marginBottom: 14 }}>
            {response.summary.transfer} transferências · {response.summary.removeOnly} remoções
          </p>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' as const }}>
            {(['all', 'transfer', 'remove_only', 'error'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '0.25rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer',
                background: filter === f ? 'var(--accent)' : 'var(--card2)',
                border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
                color: filter === f ? '#fff' : 'var(--sub)',
              }}>
                {f === 'all' ? 'Todos' : f === 'transfer' ? 'Transferências' : f === 'remove_only' ? 'Só remoção' : 'Com erro'}
              </button>
            ))}
          </div>

          {/* Result rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredResults.map((r, i) => (
              <div key={i} style={{
                ...S.card({ borderLeft: `3px solid ${statusColor(r.status)}`, overflow: 'hidden' })
              }}>
                <button onClick={() => setExpanded(expanded === i ? null : i)} style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0.9rem 1.1rem', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', textAlign: 'left', gap: 12,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: '0.95rem' }}>
                      {r.name}
                    </span>
                    <span style={{ color: 'var(--sub)', fontSize: '0.75rem', display: 'block', marginTop: 2 }}>
                      {r.from}{r.to ? ` → ${r.to}` : ''} · {modeLabel(r.mode)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em',
                      color: statusColor(r.status),
                      background: `color-mix(in srgb, ${statusColor(r.status)} 12%, transparent)`,
                      padding: '0.18rem 0.55rem', borderRadius: 4,
                    }}>
                      {statusLabel(r.status)}
                    </span>
                    <span style={{ color: 'var(--sub)', fontSize: '0.75rem' }}>{expanded === i ? '▲' : '▼'}</span>
                  </div>
                </button>

                {expanded === i && (
                  <div style={{ padding: '0.6rem 1.1rem 1rem', borderTop: '1px solid var(--border)' }}>
                    {r.steps.map((s, j) => (
                      <p key={j} style={{
                        fontSize: '0.8rem', lineHeight: 1.65,
                        color: s.ok ? 'var(--text)' : 'var(--red)',
                        display: 'flex', gap: 6, alignItems: 'flex-start',
                      }}>
                        <span style={{ flexShrink: 0 }}>{s.ok ? '✓' : '✗'}</span>
                        <span>{s.msg}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <footer style={{ textAlign: 'center', marginTop: '3.5rem', color: 'var(--sub)', fontSize: '0.68rem', letterSpacing: '0.1em' }}>
        PIPEDRIVE SYNC · AUTOMAÇÃO DE MUDANÇA DE EMPREGO
      </footer>
    </main>
  )
}
