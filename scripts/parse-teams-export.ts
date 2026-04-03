#!/usr/bin/env npx tsx
/**
 * parse-teams-export.ts — Parse Microsoft Purview eDiscovery Teams export
 *
 * Handles both PST and individual message formats from Purview export.
 * Generates a Google Doc and posts messages to a Google Chat Space.
 *
 * Usage:
 *   npx tsx scripts/parse-teams-export.ts <path-to-export-folder-or-pst>
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

// ── Config ──────────────────────────────────────────────────────────────────

const OUTPUT_DIR = path.join(__dirname, '..', 'teams-export', 'ecoflow')

interface TeamsMessage {
  sender: string
  senderEmail: string
  timestamp: string
  text: string
  hasAttachment: boolean
  attachmentNames: string[]
  messageType: string // message, reply, system
  subject: string
  conversationId: string
}

// ── Parse eDiscovery Export (EML/HTML format) ───────────────────────────────

function parseEmlFile(filePath: string): TeamsMessage | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')

    // Extract headers
    const fromMatch = content.match(/^From:\s*(.+)$/mi)
    const dateMatch = content.match(/^Date:\s*(.+)$/mi)
    const subjectMatch = content.match(/^Subject:\s*(.+)$/mi)
    const toMatch = content.match(/^To:\s*(.+)$/mi)

    // Extract body - look for the text content after headers
    let body = ''
    const bodyStart = content.indexOf('\n\n')
    if (bodyStart > -1) {
      body = content.substring(bodyStart + 2)
      // Strip HTML if present
      if (body.includes('<html') || body.includes('<HTML')) {
        body = body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        body = body.replace(/<br\s*\/?>/gi, '\n')
        body = body.replace(/<\/p>/gi, '\n')
        body = body.replace(/<\/div>/gi, '\n')
        body = body.replace(/<[^>]*>/g, '')
        body = body.replace(/&nbsp;/gi, ' ')
        body = body.replace(/&amp;/gi, '&')
        body = body.replace(/&lt;/gi, '<')
        body = body.replace(/&gt;/gi, '>')
        body = body.replace(/&quot;/gi, '"')
      }
      body = body.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    }

    const from = fromMatch ? fromMatch[1].trim() : 'Unknown'
    const fromEmailMatch = from.match(/<([^>]+)>/)

    return {
      sender: from.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || from,
      senderEmail: fromEmailMatch ? fromEmailMatch[1] : from,
      timestamp: dateMatch ? dateMatch[1].trim() : '',
      text: body.substring(0, 10000),
      hasAttachment: /^Content-Disposition:\s*attachment/mi.test(content),
      attachmentNames: [],
      messageType: 'message',
      subject: subjectMatch ? subjectMatch[1].trim() : '',
      conversationId: '',
    }
  } catch {
    return null
  }
}

// ── Parse HTML message files (Purview often exports as HTML) ────────────────

function parseHtmlFile(filePath: string): TeamsMessage | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')

    // Try to extract Teams-specific metadata
    const senderMatch = content.match(/(?:From|Sender):\s*(?:<[^>]*>)?([^<\n]+)/i)
    const dateMatch = content.match(/(?:Sent|Date):\s*(?:<[^>]*>)?([^<\n]+)/i)
    const subjectMatch = content.match(/Subject:\s*(?:<[^>]*>)?([^<\n]+)/i)

    // Extract body text
    let body = content
    body = body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    body = body.replace(/<br\s*\/?>/gi, '\n')
    body = body.replace(/<\/p>/gi, '\n')
    body = body.replace(/<\/div>/gi, '\n')
    body = body.replace(/<\/tr>/gi, '\n')
    body = body.replace(/<td[^>]*>/gi, ' | ')
    body = body.replace(/<[^>]*>/g, '')
    body = body.replace(/&nbsp;/gi, ' ')
    body = body.replace(/&amp;/gi, '&')
    body = body.replace(/&lt;/gi, '<')
    body = body.replace(/&gt;/gi, '>')
    body = body.replace(/&quot;/gi, '"')
    body = body.replace(/&#39;/gi, "'")
    body = body.replace(/\s+/g, ' ')
    body = body.trim()

    return {
      sender: senderMatch ? senderMatch[1].trim() : 'Unknown',
      senderEmail: '',
      timestamp: dateMatch ? dateMatch[1].trim() : '',
      text: body.substring(0, 10000),
      hasAttachment: false,
      attachmentNames: [],
      messageType: 'message',
      subject: subjectMatch ? subjectMatch[1].trim() : '',
      conversationId: '',
    }
  } catch {
    return null
  }
}

// ── Parse CSV metadata (Purview exports metadata as CSV) ────────────────────

function parseMetadataCsv(csvPath: string): TeamsMessage[] {
  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n')
  if (lines.length < 2) return []

  const header = parseCSVLine(lines[0])
  const messages: TeamsMessage[] = []

  // Find column indices
  const colIdx = (names: string[]) => {
    for (const name of names) {
      const idx = header.findIndex(h => h.toLowerCase().includes(name.toLowerCase()))
      if (idx >= 0) return idx
    }
    return -1
  }

  const iFrom = colIdx(['from', 'sender', 'author'])
  const iDate = colIdx(['date', 'sent', 'created', 'timestamp'])
  const iSubject = colIdx(['subject', 'title', 'topic'])
  const iBody = colIdx(['body', 'text', 'content', 'message'])
  const iTo = colIdx(['to', 'recipient'])

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const fields = parseCSVLine(line)
    const from = iFrom >= 0 ? fields[iFrom] || '' : ''
    const fromEmailMatch = from.match(/<([^>]+)>/)

    messages.push({
      sender: from.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || from,
      senderEmail: fromEmailMatch ? fromEmailMatch[1] : from,
      timestamp: iDate >= 0 ? fields[iDate] || '' : '',
      text: iBody >= 0 ? fields[iBody] || '' : '',
      hasAttachment: false,
      attachmentNames: [],
      messageType: 'message',
      subject: iSubject >= 0 ? fields[iSubject] || '' : '',
      conversationId: '',
    })
  }

  return messages
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++ }
      else if (ch === '"') { inQuotes = false }
      else { current += ch }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ',') { fields.push(current); current = '' }
      else { current += ch }
    }
  }
  fields.push(current)
  return fields
}

// ── Scan export directory for all message files ─────────────────────────────

function scanExportDir(exportPath: string): TeamsMessage[] {
  const messages: TeamsMessage[] = []

  if (!fs.existsSync(exportPath)) {
    console.error(`Export path not found: ${exportPath}`)
    return messages
  }

  const stat = fs.statSync(exportPath)

  if (stat.isFile()) {
    // Single file — could be CSV, PST, or zip
    if (exportPath.endsWith('.csv')) {
      return parseMetadataCsv(exportPath)
    }
    console.error('Single file mode — please extract the archive first and point to the folder')
    return messages
  }

  // Directory — scan recursively
  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scanDir(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        let msg: TeamsMessage | null = null

        if (ext === '.eml') {
          msg = parseEmlFile(fullPath)
        } else if (ext === '.html' || ext === '.htm') {
          msg = parseHtmlFile(fullPath)
        } else if (ext === '.csv' && entry.name.toLowerCase().includes('metadata')) {
          messages.push(...parseMetadataCsv(fullPath))
          continue
        } else if (ext === '.csv' && !entry.name.toLowerCase().includes('checksum')) {
          // Try parsing as message CSV
          const csvMsgs = parseMetadataCsv(fullPath)
          if (csvMsgs.length > 0) {
            messages.push(...csvMsgs)
            continue
          }
        } else if (ext === '.txt') {
          // Plain text message
          try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            msg = {
              sender: 'Unknown',
              senderEmail: '',
              timestamp: '',
              text: content.substring(0, 10000),
              hasAttachment: false,
              attachmentNames: [],
              messageType: 'message',
              subject: entry.name.replace(ext, ''),
              conversationId: '',
            }
          } catch { /* skip */ }
        }

        if (msg && msg.text.trim()) {
          messages.push(msg)
        }
      }
    }
  }

  scanDir(exportPath)
  return messages
}

// ── Generate Google Doc ─────────────────────────────────────────────────────

function generateDoc(messages: TeamsMessage[]): string {
  const lines: string[] = []

  lines.push(`# EcoFlowxTriSMART Technical Support — Teams Chat Archive`)
  lines.push(``)
  lines.push(`**Exported:** ${new Date().toISOString().substring(0, 10)}`)
  lines.push(`**Total Messages:** ${messages.length}`)
  if (messages.length > 0) {
    const dates = messages.map(m => m.timestamp).filter(Boolean).sort()
    if (dates.length > 0) {
      lines.push(`**Date Range:** ${dates[0]?.substring(0, 10) || 'Unknown'} — ${dates[dates.length - 1]?.substring(0, 10) || 'Unknown'}`)
    }
  }
  lines.push(`**Source:** Microsoft Teams via Purview eDiscovery export`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // Participants summary
  const participants = new Map<string, number>()
  for (const m of messages) {
    const name = m.sender || m.senderEmail || 'Unknown'
    participants.set(name, (participants.get(name) || 0) + 1)
  }

  if (participants.size > 0) {
    lines.push(`## Participants`)
    lines.push(``)
    lines.push(`| Name | Messages |`)
    lines.push(`|------|----------|`)
    for (const [name, count] of [...participants.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${name} | ${count} |`)
    }
    lines.push(``)
    lines.push(`---`)
    lines.push(``)
  }

  // Messages chronologically
  lines.push(`## Chat History`)
  lines.push(``)

  let currentDate = ''
  for (const m of messages) {
    const date = m.timestamp ? m.timestamp.substring(0, 10) : ''
    if (date && date !== currentDate) {
      currentDate = date
      lines.push(`### ${currentDate}`)
      lines.push(``)
    }

    const time = m.timestamp ? m.timestamp.substring(11, 16) : ''
    const sender = m.sender || m.senderEmail || 'Unknown'
    const attachment = m.hasAttachment ? ' [ATTACHMENT]' : ''

    lines.push(`**${sender}** ${time ? `(${time})` : ''}${attachment}`)
    if (m.text) {
      // Indent message body
      const bodyLines = m.text.split('\n').filter(l => l.trim())
      for (const bl of bodyLines.slice(0, 50)) {
        lines.push(`> ${bl}`)
      }
      if (bodyLines.length > 50) lines.push(`> ... (${bodyLines.length - 50} more lines)`)
    }
    lines.push(``)
  }

  return lines.join('\n')
}

// ── Google Chat Space Integration ───────────────────────────────────────────

interface ServiceAccountCredentials {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  token_uri: string
}

function base64url(data: string | Buffer): string {
  return Buffer.from(data).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function getAccessToken(creds: ServiceAccountCredentials, scopes: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claimSet = {
    iss: creds.client_email,
    scope: scopes,
    aud: creds.token_uri,
    iat: now,
    exp: now + 3600,
  }

  const unsignedToken = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claimSet))}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(unsignedToken)
  const signature = signer.sign(creds.private_key)
  const jwt = `${unsignedToken}.${base64url(signature)}`

  const resp = await fetch(creds.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!resp.ok) throw new Error(`Token exchange failed: ${await resp.text()}`)
  const data = await resp.json() as { access_token: string }
  return data.access_token
}

async function createChatSpace(token: string, spaceName: string): Promise<string> {
  const resp = await fetch('https://chat.googleapis.com/v1/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      displayName: spaceName,
      spaceType: 'SPACE',
      singleUserBotDm: false,
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Failed to create space: ${err}`)
  }

  const space = await resp.json() as { name: string }
  return space.name
}

async function postMessage(token: string, spaceName: string, text: string): Promise<void> {
  const resp = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    console.error(`Failed to post message: ${err}`)
  }
}

async function postToGoogleChat(messages: TeamsMessage[]): Promise<string | null> {
  // Load credentials
  const keyFile = process.env.GOOGLE_SA_KEY_FILE
  if (!keyFile || !fs.existsSync(keyFile)) {
    console.log('\n   Skipping Google Chat posting — no GOOGLE_SA_KEY_FILE set')
    console.log('   Set GOOGLE_SA_KEY_FILE and ensure Chat API scopes are delegated')
    return null
  }

  const creds: ServiceAccountCredentials = JSON.parse(fs.readFileSync(keyFile, 'utf-8'))
  const scopes = 'https://www.googleapis.com/auth/chat.spaces.create https://www.googleapis.com/auth/chat.messages.create https://www.googleapis.com/auth/chat.spaces'

  console.log('   Authenticating for Google Chat...')
  const token = await getAccessToken(creds, scopes)

  console.log('   Creating Google Chat Space...')
  const spaceName = await createChatSpace(token, 'EcoFlowxTriSMART Technical Support (Archive)')
  console.log(`   Space created: ${spaceName}`)

  // Post messages in batches with rate limiting
  console.log(`   Posting ${messages.length} messages...`)
  let posted = 0
  let currentDate = ''

  for (const m of messages) {
    const date = m.timestamp ? m.timestamp.substring(0, 10) : ''
    if (date && date !== currentDate) {
      currentDate = date
      await postMessage(token, spaceName, `📅 *--- ${currentDate} ---*`)
      await new Promise(r => setTimeout(r, 200)) // rate limit
    }

    const time = m.timestamp ? m.timestamp.substring(11, 16) : ''
    const sender = m.sender || m.senderEmail || 'Unknown'
    const attachment = m.hasAttachment ? ' 📎' : ''
    const text = `*${sender}* (${time})${attachment}\n${m.text.substring(0, 4000)}`

    await postMessage(token, spaceName, text)
    posted++

    if (posted % 50 === 0) {
      process.stdout.write(`\r   Posted ${posted}/${messages.length}`)
      await new Promise(r => setTimeout(r, 1000)) // rate limit pause every 50
    } else {
      await new Promise(r => setTimeout(r, 200)) // 200ms between messages
    }
  }

  console.log(`\r   Posted ${posted}/${messages.length} messages to Google Chat`)
  return spaceName
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const exportPath = process.argv[2]
  if (!exportPath) {
    console.error('Usage: npx tsx scripts/parse-teams-export.ts <path-to-export-folder>')
    console.error('  The export folder should contain the extracted Purview eDiscovery export')
    process.exit(1)
  }

  console.log(`\nTeams Export Parser`)
  console.log(`===================`)
  console.log(`Source: ${exportPath}`)
  console.log(`Output: ${OUTPUT_DIR}\n`)

  // Parse messages
  console.log('1. Parsing export...')
  let messages = scanExportDir(exportPath)
  console.log(`   Found ${messages.length} messages`)

  if (messages.length === 0) {
    console.log('\n   No messages found. Listing export contents:')
    if (fs.statSync(exportPath).isDirectory()) {
      const listDir = (dir: string, indent: string = '   ') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true }).slice(0, 30)
        for (const e of entries) {
          const size = e.isFile() ? ` (${(fs.statSync(path.join(dir, e.name)).size / 1024).toFixed(0)}KB)` : ''
          console.log(`${indent}${e.isDirectory() ? '📁' : '📄'} ${e.name}${size}`)
          if (e.isDirectory()) listDir(path.join(dir, e.name), indent + '  ')
        }
      }
      listDir(exportPath)
    }
    console.log('\n   Please check the export format and try again.')
    console.log('   Supported formats: .eml, .html, .csv, .txt')
    return
  }

  // Sort by timestamp
  messages.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))

  // Save raw JSON
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUTPUT_DIR, 'all-messages.json'), JSON.stringify(messages, null, 2))
  console.log(`   Saved all-messages.json`)

  // Generate doc
  console.log('\n2. Generating document...')
  const doc = generateDoc(messages)
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ECOFLOW-CHAT.md'), doc)
  console.log(`   Saved ECOFLOW-CHAT.md`)

  // Convert to docx
  try {
    const { execSync } = require('child_process')
    execSync(`pandoc "${path.join(OUTPUT_DIR, 'ECOFLOW-CHAT.md')}" -o "${path.join(OUTPUT_DIR, 'ECOFLOW-CHAT.docx')}" --from=markdown --to=docx`, { stdio: 'pipe' })
    console.log(`   Saved ECOFLOW-CHAT.docx`)
  } catch {
    console.log('   pandoc not available — .docx not generated')
  }

  // Post to Google Chat
  console.log('\n3. Google Chat Space...')
  const spaceName = await postToGoogleChat(messages)

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('COMPLETE')
  console.log('='.repeat(60))

  const participants = new Map<string, number>()
  for (const m of messages) {
    const name = m.sender || 'Unknown'
    participants.set(name, (participants.get(name) || 0) + 1)
  }

  console.log(`Messages: ${messages.length}`)
  console.log(`Participants: ${participants.size}`)
  for (const [name, count] of [...participants.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${count.toString().padStart(5)}  ${name}`)
  }
  console.log()
  console.log(`Google Doc: ${OUTPUT_DIR}/ECOFLOW-CHAT.docx`)
  if (spaceName) console.log(`Google Chat Space: ${spaceName}`)
  console.log()
  console.log('Upload ECOFLOW-CHAT.docx to Google Drive → Open with Google Docs')
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message)
  process.exit(1)
})
