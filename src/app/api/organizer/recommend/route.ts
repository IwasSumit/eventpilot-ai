
import { NextRequest, NextResponse } from 'next/server'
import { callAgentBuilder } from '@/lib/agent-builder/client'
import { mcpFind, mcpInsert } from '@/lib/agent-builder/mcp-tools'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  try {
    const { zoneId, riskData } = await req.json()
    const mcpQuery  = `find(zones, {_id: "${zoneId}"})`
    const liveZone  = await mcpFind('zones',  { _id: zoneId })
    const liveQueue = await mcpFind('queues', { zoneId })

    const prompt = `Generate operational recommendations for this zone.
Zone Risk Data: ${JSON.stringify(riskData)}
Live Zone from MongoDB: ${JSON.stringify(liveZone)}
Live Queue from MongoDB: ${JSON.stringify(liveQueue)}
Respond with JSON: { "title": "", "recommendation": "", "severity": "warning|critical", "actions": [], "reasoning": "" }`

    const agentResponse = await callAgentBuilder({
      prompt, sessionId: `rec-${nanoid()}`, context: { zoneId, riskData }
    })

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(agentResponse.text.replace(/```json|```/g, '').trim())
    } catch {
      parsed = { title: 'Operational Alert', recommendation: agentResponse.text,
        severity: 'warning', actions: [], reasoning: '' }
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