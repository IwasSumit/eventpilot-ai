import { NextRequest, NextResponse } from 'next/server'
import { mcpFind, mcpInsert, mcpUpdate } from '@/lib/agent-builder/mcp-tools'

export async function POST(req: NextRequest) {
  try {
    const { vendorId, sessionId, activityName } = await req.json()

    if (!vendorId) return NextResponse.json({ success: true })

    // STEP 1: agent reads current queue via MCP
    const liveQueues = await mcpFind('queues', { vendorId }) as Record<string, unknown>[]
    const queue      = Array.isArray(liveQueues) ? liveQueues[0] : null

    if (!queue) return NextResponse.json({ success: true })

    // STEP 2: agent calculates new queue length
    const currentLength = (queue.currentLength as number) || 0
    const serviceRate   = (queue.serviceRate   as number) || 5
    const newLength     = Math.max(0, currentLength - 1)
    const newWait       = newLength > 0 ? Math.round(newLength / serviceRate) : 0

    // STEP 3: agent writes queue update via MCP
    await mcpUpdate('queues', { _id: queue._id as string }, {
      $set: {
        currentLength: newLength,
        predictedWait: newWait,
        updatedAt:     new Date().toISOString()
      }
    })

    console.log(`Agent updated queue for ${activityName}: ${currentLength} → ${newLength}`)

    // log attendee action
    await mcpInsert('attendee_actions', {
      sessionId,
      vendorId,
      activityName:  activityName || 'unknown',
      action:        'activity_completed',
      previousQueue: currentLength,
      newQueue:      newLength,
      mcpQueryUsed:  `find(queues,{vendorId:"${vendorId}"}) → update-many(queues) [via MCP]`
    })

    return NextResponse.json({
      success:       true,
      previousQueue: currentLength,
      newQueue:      newLength
    })
  } catch (error) {
    console.error('Activity done failed:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}