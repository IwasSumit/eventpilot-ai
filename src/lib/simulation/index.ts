import { connectToDatabase } from '@/lib/mongodb/client'

export async function runSimulationTick(): Promise<void> {
  const { db } = await connectToDatabase()

  const now = new Date()
  const minuteOfDay = now.getHours() * 60 + now.getMinutes()

  // Crowd intensity curve: peaks around 20:00
  const crowdIntensity =
    0.3 +
    0.7 *
    Math.sin(
      Math.PI * Math.max(0, (minuteOfDay - 960) / 180)
    )

  // Additional surge during concert peak hours
  const concertSurge =
    minuteOfDay >= 1140 && minuteOfDay <= 1260
      ? 1.5
      : 1

  const adjustedIntensity = crowdIntensity * concertSurge

  /*
   * =====================
   * ZONE SIMULATION
   * =====================
   */

  const zones = await db.collection('zones').find({}).toArray()

  const zoneUpdates = []

  for (const zone of zones) {
    const baseChange =
      (Math.random() - 0.45) *
      0.08 *
      adjustedIntensity

    const newDensity = Math.min(
      1.2,
      Math.max(
        0.1,
        zone.crowdDensity + baseChange
      )
    )

    const newPeople = Math.round(
      newDensity * zone.safeCapacity
    )

    const riskScore = Math.round(
      Math.min(
        100,
        newDensity > 1.0
          ? 85 + (newDensity - 1) * 50
          : newDensity > 0.8
            ? 65 + (newDensity - 0.8) * 100
            : newDensity > 0.6
              ? 40 + (newDensity - 0.6) * 125
              : newDensity * 67
      )
    )

    const riskLevel =
      riskScore >= 80
        ? 'critical'
        : riskScore >= 65
          ? 'high'
          : riskScore >= 45
            ? 'attention'
            : 'normal'

    zoneUpdates.push({
      updateOne: {
        filter: { _id: zone._id },
        update: {
          $set: {
            crowdDensity: newDensity,
            currentPeople: newPeople,
            riskScore,
            riskLevel,
            updatedAt: now
          }
        }
      }
    })
  }

  if (zoneUpdates.length > 0) {
    await db.collection('zones').bulkWrite(zoneUpdates)
  }

  /*
   * =====================
   * QUEUE SIMULATION
   * =====================
   */

  const [queues, vendors] = await Promise.all([
    db.collection('queues').find({}).toArray(),
    db.collection('vendors').find({}).toArray()
  ])

  const vendorMap = new Map(
    vendors.map(v => [v._id.toString(), v])
  )

  const queueUpdates = []

  for (const queue of queues) {
    const vendor = vendorMap.get(
      queue.vendorId
    )

    const popularityMultiplier =
      0.75 +
      ((vendor?.popularityScore ?? 50) / 100)

    const avgZoneDensity =
      zones.reduce((a, z) => a + z.crowdDensity, 0) / zones.length

    const zoneMultiplier = 0.8 + avgZoneDensity

    const arrivalRate =
      queue.arrivalRate *
      adjustedIntensity *
      popularityMultiplier *
      zoneMultiplier

    const baseServiceRate = queue.serviceRate ?? 5

    const effectiveServiceRate =
      baseServiceRate * (vendor?.activeCounters ?? 1)

    const arrivals = Math.round(
      arrivalRate *
      (10 / 60) *
      (0.6 + Math.random() * 0.8)
    )

    const served = Math.min(
      queue.currentLength,
      Math.round(
        effectiveServiceRate *
        (10 / 60) *
        (0.85 + Math.random() * 0.3)
      )
    )
    const newLength = Math.max(
      0,
      Math.min(
        2000, // safety cap
        queue.currentLength + arrivals - served
      )
    )

    const newWait =
      newLength > 0
        ? Math.round(
          newLength /
          effectiveServiceRate +
          (Math.random() * 2 - 1)
        )
        : 0

    queueUpdates.push({
      updateOne: {
        filter: { _id: queue._id },
        update: {
          $set: {
            currentLength: newLength,
            predictedWait: Math.round(
              newLength / effectiveServiceRate
            ),
            updatedAt: now
          }
        }
      }
    })
  }

  if (queueUpdates.length > 0) {
    await db.collection('queues').bulkWrite(queueUpdates)
  }

  /*
   * =====================
   * INVENTORY SIMULATION
   * =====================
   */

  const inventoryItems = await db
    .collection('inventory')
    .find({})
    .toArray()

  const inventoryUpdates = []

  for (const item of inventoryItems) {
    if (item.currentStock <= 0) {
      continue
    }

    const sold = Math.round(
      item.baseSalesRate *
      adjustedIntensity *
      (10 / 60) *
      (0.7 + Math.random() * 0.6)
    )

    const newStock = Math.max(
      0,
      item.currentStock - sold
    )

    inventoryUpdates.push({
      updateOne: {
        filter: { _id: item._id },
        update: {
          $set: {
            currentStock: newStock,
            updatedAt: now
          }
        }
      }
    })
  }

  if (inventoryUpdates.length > 0) {
    await db
      .collection('inventory')
      .bulkWrite(inventoryUpdates)
  }
}