# Pipedrive Sync — Mudanças de Emprego

App Next.js para automatizar mudanças de emprego no Pipedrive via planilha Excel.

## O que faz

### Aba OKK (65 pessoas) — Transferência completa
1. Remove a pessoa do deal antigo
2. Atualiza dados: cargo, e-mail, organização
3. Adiciona ao deal novo
4. Cria anotação no novo deal com histórico da mudança

### Aba Apenas Remover (142 pessoas) — Só remoção
1. Remove a pessoa do deal antigo
2. Se já não estiver no deal, ignora e segue

> Em ambos os casos: se a pessoa já não estiver vinculada ao deal, o app apenas segue sem erro.

## Deploy no Vercel

```bash
# 1. Suba para o GitHub
git init && git add . && git commit -m "init"
git remote add origin <url-do-seu-repo>
git push -u origin main

# 2. No vercel.com → New Project → Import → Deploy
```

## Colunas da planilha (mapeamento exato)

### Aba OKK
| Coluna na planilha | Campo |
|--------------------|-------|
| Name | Nome da pessoa |
| Email | E-mail |
| Linkedin Url | LinkedIn |
| Old Company | Empresa de origem |
| New Company | Empresa de destino |
| New Title | Novo cargo |
| ID Organização Nova | ID da org no Pipedrive |
| ID Negócio Antigo | Deal de onde remover |
| ID Negócio Novo | Deal para adicionar |
| ID Pessoa | ID da pessoa no Pipedrive |

### Aba Apenas Remover
| Coluna na planilha | Campo |
|--------------------|-------|
| Name | Nome |
| Linkedin Url | LinkedIn |
| Old Company | Empresa atual |
| Old Title | Cargo atual |
| ID Negócio Antigo | Deal de onde remover |
| ID Pessoa | ID da pessoa no Pipedrive |

## Dev local

```bash
npm install
npm run dev
# http://localhost:3000
```
