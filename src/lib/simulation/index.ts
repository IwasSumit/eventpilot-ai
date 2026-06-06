
import { connectToDatabase } from '@/lib/mongodb/client'

export async function runSimulationTick(): Promise<void> {
  const { db } = await connectToDatabase()

  const now = new Date()
  const minuteOfDay = now.getHours() * 60 + now.getMinutes()

  // Crowd intensity curve: peaks around 20:00 (1200 min)
  const crowdIntensity = 0.3 + 0.7 * Math.sin(
    Math.PI * Math.max(0, (minuteOfDay - 960) / 180)
  )

  const zones = await db.collection('zones').find({}).toArray()

  for (const zone of zones) {
    // Fluctuate crowd density with realistic noise
    const baseChange = (Math.random() - 0.45) * 0.08 * crowdIntensity
    const newDensity = Math.min(1.2, Math.max(0.1, zone.crowdDensity + baseChange))
    const newPeople = Math.round(newDensity * zone.safeCapacity)

    // Recompute risk score deterministically
    const riskScore = Math.round(
      Math.min(100, newDensity > 1.0 ? 85 + (newDensity - 1) * 50 :
                    newDensity > 0.8 ? 65 + (newDensity - 0.8) * 100 :
                    newDensity > 0.6 ? 40 + (newDensity - 0.6) * 125 :
                    newDensity * 67)
    )
    const riskLevel = riskScore >= 80 ? 'critical' :
      riskScore >= 65 ? 'high' :
      riskScore >= 45 ? 'attention' : 'normal'

    await db.collection('zones').updateOne(
      { _id: zone._id },
      { $set: { crowdDensity: newDensity, currentPeople: newPeople, riskScore, riskLevel, updatedAt: now } }
    )
  }

  const queues = await db.collection('queues').find({}).toArray()

  for (const queue of queues) {
    // Simulate arrivals and departures
    const arrivalRate = queue.arrivalRate * crowdIntensity
    const serviceRate = queue.serviceRate
    const arrivals = Math.round(arrivalRate * (10 / 60) * (0.8 + Math.random() * 0.4))
    const served    = Math.min(queue.currentLength, Math.round(serviceRate * (10 / 60)))
    const newLength = Math.max(0, queue.currentLength + arrivals - served)

    const newWait = newLength > 0
      ? Math.round(newLength / serviceRate + (Math.random() * 2 - 1))
      : 0

    await db.collection('queues').updateOne(
      { _id: queue._id },
      { $set: { currentLength: newLength, predictedWait: Math.max(0, newWait), updatedAt: now } }
    )
  }

  const inventoryItems = await db.collection('inventory').find({}).toArray()

  for (const item of inventoryItems) {
    if (item.currentStock <= 0) continue
    // Deplete stock based on sales rate and crowd intensity
    const sold = Math.round(item.baseSalesRate * crowdIntensity * (10 / 60) * (0.7 + Math.random() * 0.6))
    const newStock = Math.max(0, item.currentStock - sold)

    await db.collection('inventory').updateOne(
      { _id: item._id },
      { $set: { currentStock: newStock, updatedAt: now } }
    )
  }
}