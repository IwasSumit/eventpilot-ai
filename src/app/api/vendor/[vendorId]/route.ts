import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/client'
import { forecastInventory, predictQueueWait } from '@/lib/computation'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params

    const [vendor, queue, inventory] = await Promise.all([
      getCollection<Record<string, unknown>>('vendors')
        .then(c => c.findOne({ _id: vendorId } as object)),

      getCollection<Record<string, unknown>>('queues')
        .then(c => c.findOne({ vendorId } as object)),

      getCollection<Record<string, unknown>>('inventory')
        .then(c => c.find({ vendorId } as object).toArray())
    ])

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

   
    const zone = await getCollection<Record<string, unknown>>('zones')
      .then(c => c.findOne({ _id: vendor.zoneId } as object))

  
    const baseQueueLength = (queue?.currentLength as number) || 0

    const crowdPressure =
      ((zone?.currentPeople as number) || 0) *
      0.02 
    const effectiveQueueLength = Math.round(baseQueueLength + crowdPressure)

    
    const queuePrediction = predictQueueWait({
      queueLength: effectiveQueueLength,
      serviceRate: vendor.serviceRate as number,
      activeCounters: vendor.activeCounters as number,
      popularityScore: vendor.popularityScore as number,
      walkingDelayMinutes: 2,
      extraStaffBoost: 0
    })

   
    const inventoryForecasts = inventory.map(item => ({
      ...item,
      forecast: forecastInventory({
        currentStock: item.currentStock as number,
        baseSalesRate: item.baseSalesRate as number,
        queueLength: effectiveQueueLength,
        popularityScore: vendor.popularityScore as number
      })
    }))

   
    const waitRisk = queuePrediction
      ? Math.min(100, (queuePrediction.predictedWaitMinutes / 30) * 100)
      : 0

    const inventoryRisk = inventoryForecasts.length > 0
      ? Math.max(
          ...inventoryForecasts.map(i =>
            i.forecast.riskLevel === 'critical' ? 90 :
            i.forecast.riskLevel === 'urgent' ? 70 :
            i.forecast.riskLevel === 'watch' ? 40 : 10
          )
        )
      : 0

    const vendorRisk = Math.round(
      waitRisk * 0.35 +
      inventoryRisk * 0.40 +
      ((vendor.popularityScore as number) / 100 * 50) * 0.15
    )

  
    return NextResponse.json({
      vendor,
      queue,
      effectiveQueueLength,
      queuePrediction,
      inventory: inventoryForecasts,
      vendorRisk,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Vendor data load failed' },
      { status: 500 }
    )
  }
}