import { NextRequest, NextResponse } from 'next/server'
import { mcpFind, mcpInsert, mcpUpdate } from '@/lib/agent-builder/mcp-tools'

export async function POST(req: NextRequest) {
  try {
    const { vendorId, action, itemName } = await req.json()

  
   const [liveVendors, liveQueues] = await Promise.all([
      mcpFind('vendors', { _id: vendorId }) as Promise<Record<string, unknown>[]>,
      mcpFind('queues', { vendorId }) as Promise<Record<string, unknown>[]>
    ])

    const vendor = Array.isArray(liveVendors) ? liveVendors[0] : liveVendors
    const queue = Array.isArray(liveQueues) ? liveQueues[0] : null

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }
    
    const zoneRes = await mcpFind('zones', { _id: vendor.zoneId }) as Record<string, unknown>[]
    const zone = Array.isArray(zoneRes) ? zoneRes[0] : zoneRes

    const crowdPressure =
      ((zone?.currentPeople as number) || 0) * 0.02

    const baseQueue = (queue?.currentLength as number) || 0

    const effectiveQueueLength = Math.max(
      0,
      Math.round(baseQueue + crowdPressure)
    )

    // ======================================================
    // OPEN COUNTER
    // ======================================================
    if (action === 'open_counter') {
      const currentCounters = (vendor.activeCounters as number) || 1
      const maxCounters = (vendor.maxCounters as number) || 4

      if (currentCounters >= maxCounters) {
        return NextResponse.json({
          success: false,
          message: 'All counters already open'
        })
      }

      const newCounters = currentCounters + 1
      const serviceRate = (vendor.serviceRate as number) || 5

      const newWait = Math.max(
        0,
        Math.round(effectiveQueueLength / (serviceRate * newCounters))
      )

      await mcpUpdate('vendors', { _id: vendorId }, {
        $set: {
          activeCounters: newCounters,
          updatedAt: new Date().toISOString()
        }
      })

      if (queue?._id) {
        await mcpUpdate('queues', { _id: queue._id as string }, {
          $set: {
            predictedWait: newWait,
            updatedAt: new Date().toISOString()
          }
        })
      }

      const summary =
        `Counter opened at ${vendor.name}. ` +
        `Counters: ${currentCounters} → ${newCounters}. ` +
        `Effective demand used: ${effectiveQueueLength}. ` +
        `Wait reduced to ${newWait} min.`

      await mcpInsert('agent_actions', {
        eventId: 'nova-world-tour-2026',
        trigger: 'vendor_open_counter',
        inputData: {
          vendorId,
          previousCounters: currentCounters,
          newCounters,
          effectiveQueueLength,
          newWait
        },
        recommendation: summary,
        approved: true
      })

      return NextResponse.json({
        success: true,
        action: 'open_counter',
        previousCounters: currentCounters,
        newCounters,
        maxCounters,
        effectiveQueueLength,
        newWait,
        message: summary
      })
    }

    // ======================================================
    // CLOSE COUNTER
    // ======================================================
    if (action === 'close_counter') {
      const currentCounters = (vendor.activeCounters as number) || 1

      if (currentCounters <= 1) {
        return NextResponse.json({
          success: false,
          message: 'At least one counter must remain open'
        })
      }

      const newCounters = currentCounters - 1
      const serviceRate = (vendor.serviceRate as number) || 5

      const newWait = Math.max(
        0,
        Math.round(effectiveQueueLength / (serviceRate * newCounters))
      )

      await mcpUpdate('vendors', { _id: vendorId }, {
        $set: {
          activeCounters: newCounters,
          updatedAt: new Date().toISOString()
        }
      })

      if (queue?._id) {
        await mcpUpdate('queues', { _id: queue._id as string }, {
          $set: {
            predictedWait: newWait,
            updatedAt: new Date().toISOString()
          }
        })
      }

      const summary =
        `Counter closed at ${vendor.name}. ` +
        `Counters: ${currentCounters} → ${newCounters}. ` +
        `Effective demand used: ${effectiveQueueLength}. ` +
        `Wait increased to ${newWait} min.`

      await mcpInsert('agent_actions', {
        eventId: 'nova-world-tour-2026',
        trigger: 'vendor_close_counter',
        inputData: {
          vendorId,
          previousCounters: currentCounters,
          newCounters,
          effectiveQueueLength,
          newWait
        },
        recommendation: summary,
        approved: true
      })

      return NextResponse.json({
        success: true,
        action: 'close_counter',
        previousCounters: currentCounters,
        newCounters,
        effectiveQueueLength,
        newWait,
        message: summary
      })
    }

    // ======================================================
    // RESTOCK
    // ======================================================
    if (action === 'restock' && itemName) {
      const liveInventory = await mcpFind('inventory', { vendorId }) as Record<string, unknown>[]
      const items = Array.isArray(liveInventory) ? liveInventory : []
      const item = items.find(i => i.itemName === itemName)

      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      const initialStock =
        (item.initialStock as number) ||
        ((item.currentStock as number) * 2) ||
        200

      const newStock = Math.round(initialStock * 0.8)
      const previousStock = item.currentStock as number

      await mcpUpdate('inventory',
        { vendorId, itemName },
        {
          $set: {
            currentStock: newStock,
            updatedAt: new Date().toISOString()
          }
        }
      )

      const summary =
        `${itemName} restocked at ${vendor?.name || vendorId}. ` +
        `Stock: ${previousStock} → ${newStock}.`

      await mcpInsert('agent_actions', {
        eventId: 'nova-world-tour-2026',
        trigger: 'vendor_restock',
        inputData: {
          vendorId,
          itemName,
          previousStock,
          newStock
        },
        recommendation: summary,
        approved: true
      })

      return NextResponse.json({
        success: true,
        action: 'restock',
        itemName,
        previousStock,
        newStock,
        message: summary
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Vendor action failed:', error)
    return NextResponse.json({ error: 'Vendor action failed' }, { status: 500 })
  }
}