
import { NextRequest, NextResponse } from 'next/server'
import { callAgentBuilder } from '@/lib/agent-builder/client'
import { mcpFind, mcpInsert } from '@/lib/agent-builder/mcp-tools'
import { scoreActivity, predictQueueWait } from '@/lib/computation'
import { nanoid } from 'nanoid'
import { extractJson } from '@/lib/extract-json'

const ACTIVITIES = [
  { id: 'v-samsung', name: 'Samsung Experience', zone: 'zone-a', basePopularity: 65, walkingDist: 3 },
  { id: 'v-photobooth', name: 'Photobooth', zone: 'zone-b', basePopularity: 92, walkingDist: 4 },
  { id: 'v-ramen', name: 'Ramen Stall', zone: 'zone-c', basePopularity: 88, walkingDist: 5 },
  { id: 'v-fries', name: 'Fries Stall', zone: 'zone-c', basePopularity: 72, walkingDist: 5 },
  { id: 'v-fanmsg', name: 'Fan Message WriteUp', zone: 'zone-b', basePopularity: 78, walkingDist: 4 },
  { id: 'v-lightstick', name: 'Lightstick Store', zone: 'zone-d', basePopularity: 95, walkingDist: 6 },
  { id: 'v-merch', name: 'Merchandise Counter', zone: 'zone-d', basePopularity: 90, walkingDist: 6 },
  { id: 'v-foodcart', name: 'Food Cart', zone: 'zone-c', basePopularity: 60, walkingDist: 5 },
  { id: 'v-ar', name: 'AR Selfie Zone', zone: 'zone-a', basePopularity: 70, walkingDist: 3 },
  { id: 'v-stage', name: 'Main Stage', zone: 'zone-e', basePopularity: 100, walkingDist: 8, isMandatory: true }
]

export async function POST(req: NextRequest) {
  try {
    const { preferences, timeBudgetMinutes, sessionId: sid } = await req.json()
    const sessionId = sid || nanoid()

    const [queues, zones] = await Promise.all([
      mcpFind('queues', {}),
      mcpFind('zones', { eventId: 'nova-world-tour-2026' })
    ]) as [Record<string, unknown>[], Record<string, unknown>[]]

    const queueMap = Object.fromEntries((queues || []).map(q => [q.vendorId as string, q]))
    const zoneMap = Object.fromEntries((zones || []).map(z => [z._id as string, z]))

    const scoredActivities = ACTIVITIES.filter(activity => {
      if (activity.isMandatory) return true

      return preferences.some((p: string) =>
        activity.name.toLowerCase().includes(p.toLowerCase())
      )
    }).map(activity => {
      const queue = queueMap[activity.id] as Record<string, unknown> | undefined
      const zone = zoneMap[activity.zone] as Record<string, unknown> | undefined
      const interestScore = preferences.some((p: string) =>
        activity.name.toLowerCase().includes(p.toLowerCase())) ? 90 : 30
      const crowdDensity = (zone?.crowdDensity as number) || 0.5
      const lowCrowdScore = Math.round((1 - crowdDensity) * 100)
      const queueWait = queue ? predictQueueWait({
        queueLength: (queue.currentLength as number) || 0,
        serviceRate: (queue?.serviceRate as number) ?? 5, activeCounters: 2,
        popularityScore: activity.basePopularity,
        walkingDelayMinutes: activity.walkingDist / 5, extraStaffBoost: 0
      }) : { predictedWaitMinutes: 5, confidence: 0.9 }
      const timeFitScore = Math.max(0, 100 - queueWait.predictedWaitMinutes * 3)
      const activityScore = scoreActivity({
        interestScore, popularityScore: activity.basePopularity, timeFitScore,
        lowCrowdScore, distanceScore: Math.round((10 - activity.walkingDist) * 10),
        urgencyScore: 30
      })
      return {
        ...activity, score: activityScore,
        estimatedWait: queueWait.predictedWaitMinutes,
        confidence: queueWait.confidence, crowdDensity,
        isMandatory: 'isMandatory' in activity ? activity.isMandatory : false
      }
    })

    
    // no timestamps — use order, duration, and whyNow reasoning instead
    const prompt = `Generate optimized event itinerary as a SEQUENCE — no timestamps.
Preferences: ${preferences.join(', ')}
Time budget: ${timeBudgetMinutes} minutes
Pre-scored activities (do NOT recalculate): ${JSON.stringify(
      scoredActivities.map(a => ({
        id: a.id, name: a.name, zone: a.zone, score: a.score,
        wait: a.estimatedWait, conf: a.confidence, crowd: a.crowdDensity, mandatory: a.isMandatory
      })))}
Rules:
1. Main Stage is MANDATORY — always last
2. Fit within time budget (estimatedDuration = estimatedWait + 10 min per activity)
3. Group nearby zones to minimize walking
4. Avoid crowd > 0.9 unless user selected it
5. For each activity provide a brief whyNow — one sentence explaining the operational reason for this position in the sequence
6. Include ONLY activities matching user preferences.
7. Do NOT introduce activities not present in the provided list.
8. Main Stage is the ONLY exception and must always appear last.

IMPORTANT RESPONSE RULES:
- Return ONLY valid JSON.
- Do NOT use markdown.
- Do NOT wrap response in \`\`\`json.
- Do NOT include explanations before or after the JSON.
- Do NOT include "Summary of Work".
- The response MUST start with {
- The response MUST end with }

Return EXACTLY this schema:
{
  "activities": [
    {
      "activityId": "",
      "activityName": "",
      "zone": "",
      "order": 1,
      "estimatedWait": 0,
      "estimatedDuration": 0,
      "confidence": 0,
      "crowdWarning": "",
      "score": 0,
      "whyNow": ""
    }
  ],
  "totalTime": 0,
  "reasoning": ""
}`

    const agentResponse = await callAgentBuilder({
      prompt, sessionId: `itinerary-${sessionId}`, context: { preferences, timeBudgetMinutes }
    })

    let parsed: { activities: unknown[]; totalTime: number; reasoning: string }
    try {
      parsed = JSON.parse(
        extractJson(agentResponse.text)
      )
    } catch {
      const top5 = scoredActivities
        .filter(a => a.isMandatory || preferences.some((p: string) =>
          a.name.toLowerCase().includes(p.toLowerCase())))
        .sort((a, b) => b.score - a.score).slice(0, 5)

      parsed = {
        activities: top5.map((a, index) => ({
          activityId: a.id,
          activityName: a.name,
          zone: a.zone,
          order: index + 1,
          estimatedWait: a.estimatedWait,
          estimatedDuration: a.estimatedWait + 10,
          confidence: a.confidence,
          crowdWarning:
            a.crowdDensity > 0.9
              ? `High crowd warning in ${a.zone.toUpperCase()}`
              : '',
          score: a.score,
          whyNow:
            'Recommended based on live event conditions.'
        })),

        totalTime: top5.reduce(
          (sum, a) => sum + a.estimatedWait + 10,
          0
        ),

        reasoning:
          'Fallback itinerary generated due to AI formatting issues.'
      }
    }

    await mcpInsert('itineraries', {
      sessionId, attendeeId: sessionId, activities: parsed.activities,
      totalTime: parsed.totalTime, agentReasoning: parsed.reasoning,
      mcpQueryUsed: 'find(queues,{}) + find(zones,{eventId})'
    })

    return NextResponse.json({
      sessionId, itinerary: parsed,
      scoredActivities, generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Itinerary failed:', error)
    return NextResponse.json({ error: 'Itinerary generation failed' }, { status: 500 })
  }
}