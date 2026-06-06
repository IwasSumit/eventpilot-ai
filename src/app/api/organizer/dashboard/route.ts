
import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/client'
import { computeZoneRisk, computeEventRisk } from '@/lib/computation'

export async function GET() {
  try {
    const [zones, vendors, queues, alerts, actions] = await Promise.all([
      getCollection('zones').then(c => c.find({ eventId: 'nova-world-tour-2026' }).toArray()),
      getCollection('vendors').then(c => c.find({ eventId: 'nova-world-tour-2026' }).toArray()),
      getCollection('queues').then(c => c.find({}).toArray()),
      getCollection('alerts').then(c => c.find({ status: 'active' }).sort({ createdAt: -1 }).limit(10).toArray()),
      getCollection('agent_actions').then(c => c.find({}).sort({ createdAt: -1 }).limit(5).toArray())
    ])

    const zonesWithRisk = zones.map(zone => {
      const zoneQueues = queues.filter(q => q.zoneId === zone._id)
      const maxWait    = Math.max(0, ...zoneQueues.map(q => q.predictedWait || 0))
      const risk       = computeZoneRisk({
        crowdDensity: zone.crowdDensity, incidentCount: zone.incidents,
        maxQueueWait: maxWait, minutesToNextAct: 45
      })
      return { ...zone, computedRisk: risk }
    })

    const eventRisk = computeEventRisk(
      zonesWithRisk.map(z => z.computedRisk.score),
      vendors.map(v => v.riskScore), 0)

    return NextResponse.json({ zones: zonesWithRisk, vendors, alerts,
      recentActions: actions, eventRisk, timestamp: new Date().toISOString() })
  } catch (error) {
    return NextResponse.json({ error: 'Dashboard load failed' }, { status: 500 })
  }
}