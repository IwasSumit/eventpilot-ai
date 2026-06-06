import { GoogleAuth } from 'google-auth-library'

interface AgentRequest {
  prompt: string
  sessionId: string
  context: Record<string, unknown>
}

interface AgentResponse {
  text: string
  sessionId: string
}

async function getAccessToken(): Promise<string> {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    const credentials = JSON.parse(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    )

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    })

    return (await auth.getAccessToken()) as string
  }

  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  })

  return (await auth.getAccessToken()) as string
}

export async function callAgentBuilder(
  req: AgentRequest
): Promise<AgentResponse> {
  const project = process.env.GOOGLE_CLOUD_PROJECT!
  const agentId = process.env.VERTEX_AI_AGENT_ID!

  console.log('===== AGENT CONFIG =====')
  console.log('PROJECT:', project)
  console.log('AGENT:', agentId)
  console.log('========================')

  const token = await getAccessToken()

  const endpoint =
    `https://aiplatform.googleapis.com/v1beta1/projects/${project}/locations/global/interactions`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Api-Revision': '2026-05-20'
    },
    body: JSON.stringify({
      agent: agentId,
      stream: true,
      background: true,
      store: true,
      environment: {
        type: 'remote',
        network: {
          allowlist: [{ domain: '*' }]
        }
      },
      input: [
        {
          type: 'user_input',
          content: [
            {
              type: 'text',
              text: req.prompt
            }
          ]
        }
      ]
    })
  })

  if (!response.ok) {
    const err = await response.text()

    console.error(
      'Agent Builder error:',
      response.status,
      err
    )

    return callGeminiFallback(req, token)
  }

  const rawText = await response.text()

  console.log('===== RAW AGENT SSE =====')
  console.log(rawText)
  console.log('=========================')

  const lines = rawText
    .split('\n')
    .filter(line => line.startsWith('data: '))

  let text = ''

  for (const line of lines) {
    try {
      const json = JSON.parse(
        line.replace('data: ', '')
      )

      // Handle Agent Builder step.delta format
      if (
        json.delta &&
        typeof json.delta.text === 'string'
      ) {
        text += json.delta.text
      }

      // Backup parsing path
      if (
        json.step &&
        json.step.content &&
        Array.isArray(json.step.content)
      ) {
        for (const item of json.step.content) {
          if (
            item &&
            item.type === 'text' &&
            typeof item.text === 'string'
          ) {
            text += item.text
          }
        }
      }
    } catch (err) {
      console.error('Failed parsing SSE chunk:', err)
    }
  }

  console.log('===== EXTRACTED TEXT =====')
  console.log(text)
  console.log('==========================')

  return {
    text,
    sessionId: req.sessionId
  }
}

async function callGeminiFallback(
  req: AgentRequest,
  token: string
): Promise<AgentResponse> {
  const project = process.env.GOOGLE_CLOUD_PROJECT!
  const location =
    process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'

  const model =
    process.env.GEMINI_MODEL ||
    'gemini-3-flash-preview'

  const systemPrompt = `
You are EventPilot AI, an operational intelligence agent for live events.
You receive pre-computed operational scores.
Do NOT perform calculations.
Interpret scores and generate human-readable recommendations.
Format responses as JSON when asked.
Be concise, specific, and actionable.
`

  const endpoint =
    `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: systemPrompt
          }
        ]
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: req.prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024
      }
    })
  })

  const data = await res.json()

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

  return {
    text,
    sessionId: req.sessionId
  }
}