
import { NextRequest, NextResponse } from 'next/server'
import { callAgentBuilder } from '@/lib/agent-builder/client'
import { mcpFind, mcpInsert } from '@/lib/agent-builder/mcp-tools'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  try {
    const { vendorId, vendorData, autoFired, itemName } = await req.json()
    const liveData = await mcpFind('queues', { vendorId })

    const prompt = `Generate specific operational advice for this vendor.
Vendor: ${vendorData.vendor.name}
Risk score: ${vendorData.vendorRisk}/100
Queue: ${vendorData.queue?.currentLength ?? 0} people, ${vendorData.queuePrediction?.predictedWaitMinutes ?? 0} min wait
Active counters: ${vendorData.vendor.activeCounters} of ${vendorData.vendor.maxCounters}
Inventory: ${vendorData.inventory.map((i: { itemName: string; currentStock: number; forecast: { stockOutMinutes: number; riskLevel: string } }) =>
      `${i.itemName}: ${i.currentStock} left, stockout in ${i.forecast.stockOutMinutes === 9999 ? 'N/A' : i.forecast.stockOutMinutes + ' min'}`).join(', ')}
Live MongoDB queue: ${JSON.stringify(liveData)}
${autoFired ? `URGENT: ${itemName} will stock out in under 20 minutes. Auto-triggered alert.` : ''}
Respond ONLY in markdown.

Use this format:

### Queue and Inventory Situation
- Brief assessment of queue and stock status.

### Actionable Recommendations
1. Recommendation with timing.
2. Recommendation with timing.
3. Recommendation with timing.

Keep response under 250 words.
Avoid generic statements.
Do not return JSON.`

    const response = await callAgentBuilder({ prompt, sessionId: `vendor-${nanoid()}`, context: { vendorId, autoFired: autoFired ?? false } })
    const advice = response.text

    const mcpQuery = `find(queues,{vendorId:"${vendorId}"}) + insert(alerts) + insert(agent_actions)`

    const existingAlerts = await mcpFind('alerts', {
      vendorId,
      status: 'active'
    })
    if (existingAlerts.length === 0) {
      await mcpInsert('alerts', {
        eventId: 'nova-world-tour-2026',
        type: 'vendor_risk',
        severity:
          vendorData.vendorRisk >= 75
            ? 'critical'
            : 'warning',
        title: `${vendorData.vendor.name}${autoFired ? ' — Auto Alert' : ''
          }`,
        message: `Vendor risk: ${vendorData.vendorRisk}/100`,
        recommendation: advice,
        vendorId,
        status: 'active',
        autoFired: autoFired ?? false
      })
    }

    await mcpInsert('agent_actions', {
      eventId: 'nova-world-tour-2026',
      trigger: autoFired ? `auto_inventory_${vendorId}` : `vendor_request_${vendorId}`,
      inputData: { vendorRisk: vendorData.vendorRisk, vendorId },
      recommendation: advice,
      mcpQueryUsed: mcpQuery,
      approved: false
    })

    return NextResponse.json({ advice })
  } catch (error) {
    console.error('Vendor advice failed:', error)
    return NextResponse.json({ error: 'Vendor advice failed' }, { status: 500 })
  }
}