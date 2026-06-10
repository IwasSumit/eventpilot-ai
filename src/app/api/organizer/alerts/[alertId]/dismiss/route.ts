import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/client'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const { alertId } = await params

    const col = await getCollection('alerts')

    const allActive = await col
      .find({ status: 'active' })
      .toArray()

    const alert = allActive.find(
      a =>
        String(a._id) === alertId ||
        (a as Record<string, unknown>).id === alertId
    )

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    await col.updateOne(
      { _id: alert._id },
      {
        $set: {
          status: 'dismissed',
          dismissedAt: new Date()
        }
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Dismiss failed:', error)

    return NextResponse.json(
      { error: 'Dismiss failed' },
      { status: 500 }
    )
  }
}