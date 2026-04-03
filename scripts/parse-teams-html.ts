#!/usr/bin/env npx tsx
/**
 * parse-teams-html.ts — Parse Purview Teams HTML export into Google Doc
 */

import * as fs from 'fs'
import * as path from 'path'

const TEAMS_DIR = '/Users/gregkelsch/Desktop/Items.1.001.EcoFlow 2/Exchange/EcoFlowxTriSMARTTechnicalSupport@trismartsolar.com/TeamsMessagesData'
const OUTPUT_DIR = path.join(__dirname, '..', 'teams-export', 'ecoflow')

interface ChatMessage {
  sender: string
  timestamp: string
  text: string
  topic: string // filename as topic/thread
  images: string[]
}

function parseTeamsHtml(filePath: string): ChatMessage[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const messages: ChatMessage[] = []
  const topic = path.basename(filePath, '.html')

  // Teams HTML exports have message blocks with sender and timestamp
  // Pattern: <div class="message"> blocks or similar structures
  // Each message typically has a sender name, timestamp, and body

  // Try to find individual messages within the conversation HTML
  // Teams exports use various structures, let's handle the common ones

  // Method 1: Look for message containers with sender/time/body
  const msgPattern = /<div[^>]*class="[^"]*message[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*message|$)/gi
  const senderPattern = /<span[^>]*class="[^"]*(?:sender|author|name|from)[^"]*"[^>]*>([^<]+)<\/span>/i
  const timePattern = /<span[^>]*class="[^"]*(?:time|date|timestamp)[^"]*"[^>]*>([^<]+)<\/span>/i

  // Method 2: Simpler — just extract all text with structure
  // Strip the HTML but preserve structure
  let text = content

  // Remove style/script blocks
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

  // Convert common Teams HTML patterns to readable text
  // Teams messages often have: <div class="clearfix">..sender..</div> <div>..message..</div>
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n')
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<\/tr>/gi, '\n')
  text = text.replace(/<hr[^>]*>/gi, '\n---\n')
  text = text.replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, '[$1]')
  text = text.replace(/<img[^>]*>/gi, '[image]')
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
  text = text.replace(/<[^>]*>/g, '')

  // Decode HTML entities
  text = text.replace(/&nbsp;/gi, ' ')
  text = text.replace(/&amp;/gi, '&')
  text = text.replace(/&lt;/gi, '<')
  text = text.replace(/&gt;/gi, '>')
  text = text.replace(/&quot;/gi, '"')
  text = text.replace(/&#39;/gi, "'")
  text = text.replace(/&#x200B;/gi, '')

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.trim()

  // Try to parse individual messages from the text
  // Teams format often has: "Name  Timestamp\nMessage text"
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Teams Purview format: "Name <email>\n  date\n  time\n  subject/body"
  // Sender pattern: "Name <email@domain.com>" or "Name &lt;email@domain.com&gt;"
  const senderLinePattern = /^(.+?)\s*(?:<|&lt;)([^>&]+)(?:>|&gt;)\s*$/
  const dateLinePattern = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/
  const timeLinePattern = /^\d{1,2}:\d{2}\s*[AP]M$/

  let currentSender = ''
  let currentEmail = ''
  let currentDate = ''
  let currentTime = ''
  let currentBody: string[] = []
  let expectingDate = false
  let expectingTime = false

  for (const line of lines) {
    const senderMatch = line.match(senderLinePattern)
    if (senderMatch) {
      // Save previous message
      if (currentSender && currentBody.length > 0) {
        messages.push({
          sender: currentSender,
          timestamp: `${currentDate} ${currentTime}`.trim(),
          text: currentBody.join('\n').trim(),
          topic,
          images: [],
        })
      }
      currentSender = senderMatch[1].trim()
      currentEmail = senderMatch[2].trim()
      currentBody = []
      currentDate = ''
      currentTime = ''
      expectingDate = true
      expectingTime = false
      continue
    }

    if (expectingDate && dateLinePattern.test(line)) {
      currentDate = line
      expectingDate = false
      expectingTime = true
      continue
    }

    if (expectingTime && timeLinePattern.test(line)) {
      currentTime = line
      expectingTime = false
      continue
    }

    expectingDate = false
    expectingTime = false

    if (line && currentSender) {
      currentBody.push(line)
    } else if (line && !currentSender) {
      currentBody.push(line)
    }
  }

  // Save last message
  if (currentSender && currentBody.length > 0) {
    messages.push({
      sender: currentSender,
      timestamp: `${currentDate} ${currentTime}`.trim(),
      text: currentBody.join('\n').trim(),
      topic,
      images: [],
    })
  }

  // If no structured messages found, treat the whole file as one message
  if (messages.length === 0 && text.trim()) {
    messages.push({
      sender: 'Unknown',
      timestamp: '',
      text: text.substring(0, 10000),
      topic,
      images: [],
    })
  }

  return messages
}

function generateDoc(allMessages: ChatMessage[]): string {
  const lines: string[] = []

  lines.push(`# EcoFlowxTriSMART Technical Support — Teams Chat Archive`)
  lines.push(``)
  lines.push(`**Exported:** ${new Date().toISOString().substring(0, 10)}`)
  lines.push(`**Total Messages:** ${allMessages.length}`)
  lines.push(`**Source:** Microsoft Teams via Purview eDiscovery export`)
  lines.push(`**Purpose:** Archive of EcoFlow technical support channel for migration to Google Chat`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // Participants
  const participants = new Map<string, number>()
  for (const m of allMessages) {
    if (m.sender && m.sender !== 'Unknown') {
      participants.set(m.sender, (participants.get(m.sender) || 0) + 1)
    }
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

  // Group by topic/thread
  const byTopic = new Map<string, ChatMessage[]>()
  for (const m of allMessages) {
    const list = byTopic.get(m.topic) || []
    list.push(m)
    byTopic.set(m.topic, list)
  }

  lines.push(`## Conversations (${byTopic.size} threads)`)
  lines.push(``)

  // Sort topics by earliest timestamp
  const sortedTopics = [...byTopic.entries()].sort((a, b) => {
    const aTime = a[1].find(m => m.timestamp)?.timestamp || ''
    const bTime = b[1].find(m => m.timestamp)?.timestamp || ''
    return aTime.localeCompare(bTime)
  })

  for (const [topic, msgs] of sortedTopics) {
    lines.push(`### ${topic}`)
    lines.push(``)

    for (const m of msgs) {
      const time = m.timestamp ? ` (${m.timestamp})` : ''
      if (m.sender && m.sender !== 'Unknown') {
        lines.push(`**${m.sender}**${time}`)
      } else if (m.timestamp) {
        lines.push(`*${m.timestamp}*`)
      }
      for (const textLine of m.text.split('\n')) {
        lines.push(`> ${textLine}`)
      }
      lines.push(``)
    }

    lines.push(`---`)
    lines.push(``)
  }

  return lines.join('\n')
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nTeams HTML Export Parser`)
  console.log(`========================`)
  console.log(`Source: ${TEAMS_DIR}`)
  console.log(`Output: ${OUTPUT_DIR}\n`)

  // Find all HTML files
  const htmlFiles = fs.readdirSync(TEAMS_DIR).filter(f => f.endsWith('.html'))
  console.log(`1. Found ${htmlFiles.length} HTML message files`)

  // Parse all
  console.log('2. Parsing messages...')
  const allMessages: ChatMessage[] = []
  let parsed = 0

  for (const file of htmlFiles) {
    const msgs = parseTeamsHtml(path.join(TEAMS_DIR, file))
    allMessages.push(...msgs)
    parsed++
    if (parsed % 50 === 0) process.stdout.write(`\r   Parsed ${parsed}/${htmlFiles.length}`)
  }
  console.log(`\r   Parsed ${parsed}/${htmlFiles.length} files → ${allMessages.length} messages`)

  // Save
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUTPUT_DIR, 'all-messages.json'), JSON.stringify(allMessages, null, 2))
  console.log(`   Saved all-messages.json`)

  // Generate doc
  console.log('\n3. Generating document...')
  const doc = generateDoc(allMessages)
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

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('COMPLETE')
  console.log('='.repeat(60))
  console.log(`Messages: ${allMessages.length}`)
  console.log(`Threads: ${new Set(allMessages.map(m => m.topic)).size}`)

  const participants = new Map<string, number>()
  for (const m of allMessages) {
    if (m.sender && m.sender !== 'Unknown') {
      participants.set(m.sender, (participants.get(m.sender) || 0) + 1)
    }
  }
  console.log(`Participants: ${participants.size}`)
  for (const [name, count] of [...participants.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${count.toString().padStart(5)}  ${name}`)
  }

  console.log(`\nGoogle Doc: ${OUTPUT_DIR}/ECOFLOW-CHAT.docx`)
  console.log('Upload to Google Drive → Open with Google Docs')
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message)
  process.exit(1)
})
