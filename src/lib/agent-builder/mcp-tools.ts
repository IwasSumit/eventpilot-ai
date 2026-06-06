let mcpSessionId: string | null = null
let mcpSessionPromise: Promise<string> | null = null

async function initMcpSession(): Promise<string> {
  if (mcpSessionId) {
    return mcpSessionId
  }

  if (mcpSessionPromise) {
    return mcpSessionPromise
  }

  mcpSessionPromise = (async () => {
    const mcpUrl =
      process.env.MONGODB_MCP_URL || 'http://localhost:3001'

    const res = await fetch(`${mcpUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'eventpilot',
            version: '1.0.0'
          }
        }
      })
    })

    const text = await res.text()

    console.log('================ INIT MCP ================')
    console.log('STATUS:', res.status)
    console.log('HEADERS:', Object.fromEntries(res.headers.entries()))
    console.log('BODY:', text)
    console.log('==========================================')

    const sessionId = res.headers.get('mcp-session-id')

    if (!sessionId) {
      throw new Error('MCP session ID not returned')
    }

    mcpSessionId = sessionId

    return sessionId
  })()

  try {
    return await mcpSessionPromise
  } finally {
    mcpSessionPromise = null
  }
}

function extractSseData(text: string): Record<string, unknown> {
  const dataLine = text
    .split('\n')
    .find(line => line.startsWith('data:'))

  if (!dataLine) {
    throw new Error(`No data line found in SSE response:\n${text}`)
  }

  return JSON.parse(
    dataLine.replace(/^data:\s*/, '')
  ) as Record<string, unknown>
}

function extractMongoDocuments(
  content: Array<Record<string, unknown>>
) {
  for (const item of content) {
    const text = item.text as string

    if (!text) continue

    const startTag = '<untrusted-user-data-'
    const startIndex = text.indexOf(startTag)

    if (startIndex === -1) continue

    const firstJsonBracket = text.indexOf('[', startIndex)

    if (firstJsonBracket === -1) continue

    const endMarker = '\n</untrusted-user-data-'
    const endIndex = text.indexOf(
      endMarker,
      firstJsonBracket
    )

    if (endIndex === -1) continue

    const jsonString = text
      .substring(firstJsonBracket, endIndex)
      .trim()

    try {
      const parsed = JSON.parse(jsonString)

      console.log(
        'Mongo documents parsed:',
        Array.isArray(parsed)
          ? parsed.length
          : 'not-array'
      )

      return parsed
    } catch (err) {
      console.error(
        'Failed parsing Mongo documents:',
        err
      )

      console.log(
        'JSON STRING PREVIEW:',
        jsonString.slice(0, 500)
      )
    }
  }

  return null
}

async function callMcp(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const mcpUrl =
    process.env.MONGODB_MCP_URL || 'http://localhost:3001'

  const sessionId = await initMcpSession()

  const res = await fetch(`${mcpUrl}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'Mcp-Session-Id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    })
  })

  const text = await res.text()

  console.log('================ MCP CALL ================')
  console.log('TOOL:', toolName)
  console.log('ARGS:', JSON.stringify(args, null, 2))
  console.log('SESSION:', sessionId)
  console.log('==========================================')

  console.log('================ MCP RESPONSE ================')
  console.log('STATUS:', res.status)
  console.log(text)
  console.log('==============================================')

  let payload: Record<string, unknown>

  if (
    text.startsWith('event:') ||
    text.includes('\ndata:')
  ) {
    payload = extractSseData(text)
  } else {
    payload = JSON.parse(text)
  }

  if (payload.error) {
    console.error('MCP ERROR:', payload.error)

    mcpSessionId = null

    throw new Error(
      (payload.error as Record<string, unknown>)
        .message as string
    )
  }

  const result =
    payload.result as Record<string, unknown>

  const content =
    result?.content as
      | Array<Record<string, unknown>>
      | undefined

  if (!content?.length) {
    return null
  }

  const docs = extractMongoDocuments(content)

  if (docs) {
    return docs
  }

  return content
}

async function callMcpWithRetry(
  toolName: string,
  args: Record<string, unknown>,
  retries = 2
): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callMcp(toolName, args)
    } catch (error) {
      const isLastAttempt = attempt === retries
      if (isLastAttempt) throw error

      // cold start — wait 3 seconds and retry
      console.log(`MCP attempt ${attempt + 1} failed, retrying in 3s...`)
      await new Promise(r => setTimeout(r, 3000))

      // reset session so next attempt re-initializes
      mcpSessionId = null
    }
  }
  throw new Error('MCP failed after all retries')
}

export async function mcpFind(
  collection: string,
  filter: Record<string, unknown>,
  limit = 100
): Promise<Record<string, unknown>[]> {
  const result = await callMcpWithRetry('find', {
    database:   process.env.MONGODB_DB || 'eventpilot',
    collection,
    filter,
    limit
  })
  return Array.isArray(result)
    ? (result as Record<string, unknown>[])
    : []
}

export async function mcpInsert(
  collection: string,
  document: Record<string, unknown>
) {
  return callMcpWithRetry('insert-many', {
    database:  process.env.MONGODB_DB || 'eventpilot',
    collection,
    documents: [{ ...document, createdAt: new Date().toISOString() }]
  })
}

export async function mcpUpdate(
  collection: string,
  filter: Record<string, unknown>,
  update: Record<string, unknown>
) {
  return callMcpWithRetry('update-many', {
    database:   process.env.MONGODB_DB || 'eventpilot',
    collection,
    filter,
    update
  })
}