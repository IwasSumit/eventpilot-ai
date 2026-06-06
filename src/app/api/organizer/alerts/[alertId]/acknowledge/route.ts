
import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/client'
import { mcpFind, mcpInsert, mcpUpdate } from '@/lib/agent-builder/mcp-tools'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const { alertId } = await params
    const col         = await getCollection('alerts')

    const allActive = await col.find({ status: 'active' }).sort({ createdAt: -1 }).limit(20).toArray()
    const alert     = allActive.find(a => String(a._id) === alertId || (a as Record<string, unknown>).id === alertId) || allActive[0]

    // mark alert acknowledged
    await col.updateMany(
      { zone: (alert as Record<string, unknown>)?.zone, status: 'active' },
      { $set: { status: 'acknowledged', acknowledgedAt: new Date() } }
    )

    const zoneId = (alert as Record<string, unknown>)?.zone as string | undefined
    if (!zoneId) {
      await mcpInsert('agent_actions', {
        eventId: 'nova-world-tour-2026', trigger: 'human_approval',
        inputData: { alertId }, recommendation: 'Alert acknowledged by organizer',
        mcpQueryUsed: `updateOne(alerts,{_id:"${alertId}"})`, approved: true
      })
      return NextResponse.json({ success: true })
    }

    // STEP 1: read live state via MCP
    const zoneResults  = await mcpFind('zones',  { _id: zoneId })
    const queueResults = await mcpFind('queues', { zoneId })
    const zone         = zoneResults[0]
    const queues       = queueResults
    if (!zone) return NextResponse.json({ error: 'Zone not found' }, { status: 404 })

    // STEP 2: calculate new values
    const currentDensity = (zone.crowdDensity as number) || 0.85
    const safeCapacity   = (zone.safeCapacity  as number) || 1600
    const densityDrop    = String(alert?.title || '').toLowerCase().includes('incident') ? 0.22 : 0.15
    const newDensity     = Math.max(0.35, currentDensity - densityDrop)
    const newPeople      = Math.round(newDensity * safeCapacity)
    const newRiskScore   = Math.round(Math.min(100,
      newDensity > 0.8 ? 65 + (newDensity - 0.8) * 100 :
      newDensity > 0.6 ? 40 + (newDensity - 0.6) * 125 : newDensity * 67))
    const newRiskLevel = newRiskScore >= 80 ? 'critical' : newRiskScore >= 65 ? 'high' : newRiskScore >= 45 ? 'attention' : 'normal'

    // STEP 3: agent writes zone update via MCP
    await mcpUpdate('zones', { _id: zoneId }, {
      $set: { crowdDensity: newDensity, currentPeople: newPeople, riskScore: newRiskScore, riskLevel: newRiskLevel, updatedAt: new Date().toISOString() }
    })

    // STEP 4: agent writes queue updates via MCP
    let queuesUpdated = 0
    for (const queue of queues) {
      const currentLength = (queue.currentLength as number) || 0
      const serviceRate   = (queue.serviceRate   as number) || 5
      const newLength     = Math.max(0, Math.round(currentLength * 0.65))
      const newWait       = newLength > 0 ? Math.round(newLength / serviceRate) : 0
      await mcpUpdate('queues', { _id: queue._id as string }, {
        $set: { currentLength: newLength, predictedWait: newWait, updatedAt: new Date().toISOString() }
      })
      queuesUpdated++
    }

    const summary = `Crowd redistribution for ${zoneId}. Density: ${Math.round(currentDensity * 100)}%→${Math.round(newDensity * 100)}%. Risk: ${zone.riskScore}→${newRiskScore} (${newRiskLevel}). ${queuesUpdated} queues reduced.`

    await mcpInsert('agent_actions', {
      eventId: 'nova-world-tour-2026', trigger: 'human_approval_agent_execution',
      inputData: { alertId, zone: zoneId, previousDensity: Math.round(currentDensity * 100), newDensity: Math.round(newDensity * 100), previousRisk: zone.riskScore, newRisk: newRiskScore },
      recommendation: summary,
      mcpQueryUsed: `mcpFind(zones)→mcpFind(queues)→mcpUpdate(zones)→mcpUpdate(queues) [all via MCP]`,
      approved: true
    })

    return NextResponse.json({ success: true, zone: zoneId, previousDensity: Math.round(currentDensity * 100), newDensity: Math.round(newDensity * 100), previousRisk: zone.riskScore as number, newRisk: newRiskScore, newRiskLevel, queuesUpdated, message: summary })
  } catch (error) {
    console.error('Acknowledge failed:', error)
    return NextResponse.json({ error: 'Acknowledge failed' }, { status: 500 })
  }
}