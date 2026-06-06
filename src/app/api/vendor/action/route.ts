
import { NextRequest, NextResponse } from 'next/server'
import { mcpFind, mcpInsert, mcpUpdate } from '@/lib/agent-builder/mcp-tools'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  try {
    const { vendorId, action, itemName } = await req.json()

    if (action === 'open_counter') {
      // STEP 1: agent reads live vendor + queue via MCP
      const liveVendors = await mcpFind('vendors', { _id: vendorId }) as Record<string, unknown>[]
      const liveQueues  = await mcpFind('queues',  { vendorId })      as Record<string, unknown>[]

      const vendor = Array.isArray(liveVendors) ? liveVendors[0] : liveVendors
      const queue  = Array.isArray(liveQueues)  ? liveQueues[0]  : null

      if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })

      const currentCounters = (vendor.activeCounters as number) || 1
      const maxCounters     = (vendor.maxCounters     as number) || 4

      if (currentCounters >= maxCounters) {
        return NextResponse.json({ success: false, message: 'All counters already open' })
      }

      // STEP 2: agent calculates new values
      const newCounters   = currentCounters + 1
      const serviceRate   = (vendor.serviceRate as number) || 5
      const queueLength   = queue ? (queue.currentLength as number) || 0 : 0
      const newWait       = Math.max(0, Math.round(queueLength / (serviceRate * newCounters)))

      // STEP 3: agent writes vendor update via MCP
      await mcpUpdate('vendors', { _id: vendorId }, {
        $set: {
          activeCounters: newCounters,
          updatedAt:      new Date().toISOString()
        }
      })

      // STEP 4: agent writes queue update via MCP
      if (queue?._id) {
        await mcpUpdate('queues', { _id: queue._id as string }, {
          $set: {
            predictedWait: newWait,
            updatedAt:     new Date().toISOString()
          }
        })
      }

      const summary = `Counter opened at ${vendor.name}. ` +
        `Active counters: ${currentCounters} → ${newCounters} of ${maxCounters}. ` +
        `Predicted wait reduced to ${newWait} min.`

      console.log('Agent executed open_counter:', summary)

      // STEP 5: log agent execution
      await mcpInsert('agent_actions', {
        eventId:   'nova-world-tour-2026',
        trigger:   'vendor_open_counter',
        inputData: {
          vendorId,
          previousCounters: currentCounters,
          newCounters,
          previousWait:     queue?.predictedWait,
          newWait
        },
        recommendation: summary,
        mcpQueryUsed:   `find(vendors,{_id:"${vendorId}"}) → find(queues,{vendorId:"${vendorId}"}) → ` +
                        `update-many(vendors) → update-many(queues) [all via MCP]`,
        approved:        true
      })

      return NextResponse.json({
        success:          true,
        action:           'open_counter',
        previousCounters: currentCounters,
        newCounters,
        maxCounters,
        newWait,
        message:          summary
      })
    }

    if (action === 'restock' && itemName) {
      // STEP 1: agent reads live inventory via MCP
      const liveInventory = await mcpFind('inventory', { vendorId }) as Record<string, unknown>[]
      const items         = Array.isArray(liveInventory) ? liveInventory : []
      const item          = items.find(i => i.itemName === itemName)

      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

      const liveVendors = await mcpFind('vendors', { _id: vendorId }) as Record<string, unknown>[]
      const vendor      = Array.isArray(liveVendors) ? liveVendors[0] : liveVendors

      // STEP 2: agent calculates new stock level
      const initialStock  = (item.initialStock as number) || ((item.currentStock as number) * 2) || 200
      const newStock      = Math.round(initialStock * 0.8)
      const previousStock = item.currentStock as number

      // STEP 3: agent writes inventory update via MCP
      await mcpUpdate('inventory',
        { vendorId, itemName },
        {
          $set: {
            currentStock: newStock,
            updatedAt:    new Date().toISOString()
          }
        }
      )

      const summary = `${itemName} restocked at ${(vendor as Record<string, unknown>)?.name || vendorId}. ` +
        `Stock: ${previousStock} → ${newStock} units (80% of initial ${initialStock}).`

      console.log('Agent executed restock:', summary)

      // STEP 4: log agent execution
      await mcpInsert('agent_actions', {
        eventId:   'nova-world-tour-2026',
        trigger:   'vendor_restock',
        inputData: {
          vendorId,
          itemName,
          previousStock,
          newStock,
          initialStock
        },
        recommendation: summary,
        mcpQueryUsed:   `find(inventory,{vendorId:"${vendorId}"}) → ` +
                        `update-many(inventory,{vendorId:"${vendorId}",itemName:"${itemName}"}) [via MCP]`,
        approved:        true
      })

      return NextResponse.json({
        success:       true,
        action:        'restock',
        itemName,
        previousStock,
        newStock,
        message:       summary
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Vendor action failed:', error)
    return NextResponse.json({ error: 'Vendor action failed' }, { status: 500 })
  }
}