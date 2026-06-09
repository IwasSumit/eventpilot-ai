
import { NextRequest, NextResponse } from 'next/server'
import { callAgentBuilder } from '@/lib/agent-builder/client'
import { mcpFind, mcpInsert } from '@/lib/agent-builder/mcp-tools'
import { nanoid } from 'nanoid'
import { extractJson } from '@/lib/extract-json'

export async function POST(req: NextRequest) {
  try {
    const { zoneId, riskData } = await req.json()
    const mcpQuery = `find(zones, {_id: "${zoneId}"})`
    const liveZone = await mcpFind('zones', { _id: zoneId })
    const liveQueue = await mcpFind('queues', { zoneId })

    const prompt = `
You are EventPilot AI, an operations advisor for live events.

Your role is to INTERPRET operational signals.
Do NOT invent new data.
Do NOT perform calculations.
Use ONLY the provided inputs.

ZONE DATA:
${JSON.stringify(riskData)}

LIVE ZONE STATE:
${JSON.stringify(liveZone)}

LIVE QUEUE STATE:
${JSON.stringify(liveQueue)}

TASK:
Generate ONE operational recommendation for venue staff.

RULES:
- Use severity "critical" only if the zone risk level is critical OR crowd density exceeds 0.90.
- Otherwise use severity "warning".
- Actions must be practical actions venue staff can execute immediately.
- Provide between 2 and 4 actions.
- Keep recommendations concise and operational.
- Do NOT mention MongoDB.
- Do NOT explain how the recommendation was generated.
- Do NOT include markdown.
- Do NOT wrap the response in \`\`\`.
- Return ONLY valid JSON.
- The response MUST begin with {
- The response MUST end with }

Return EXACTLY this schema:

{
  "title": "",
  "recommendation": "",
  "severity": "warning",
  "actions": [
    ""
  ],
  "reasoning": ""
}
`

    const agentResponse = await callAgentBuilder({
      prompt, sessionId: `rec-${nanoid()}`, context: { zoneId, riskData }
    })

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(
  extractJson(agentResponse.text)
)
    } catch {
      parsed = {
        title: 'Operational Alert', recommendation: agentResponse.text,
        severity: 'warning', actions: [], reasoning: ''
      }
    }

    await mcpInsert('agent_actions', {
      eventId: 'nova-world-tour-2026', trigger: `zone_risk_${zoneId}`,
      inputData: riskData, recommendation: parsed.recommendation as string,
      mcpQueryUsed: mcpQuery, approved: false
    })

    await mcpInsert('alerts', {
      eventId: 'nova-world-tour-2026', type: 'zone_risk',
      severity: parsed.severity as string, title: parsed.title as string,
      message: `Zone risk score: ${riskData.score}`,
      recommendation: parsed.recommendation as string,
      zone: zoneId, status: 'active'
    })

    return NextResponse.json({ ...parsed, mcpQueryUsed: mcpQuery })
  } catch (error) {
    console.error('Recommendation failed:', error)
    return NextResponse.json({ error: 'Recommendation generation failed' }, { status: 500 })
  }
}