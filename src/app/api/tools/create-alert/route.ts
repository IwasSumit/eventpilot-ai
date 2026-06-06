
import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/client'

export async function POST(req: NextRequest) {
  const body   = await req.json()
  const col    = await getCollection('alerts')
  const result = await col.insertOne({
    ...body, eventId: 'nova-world-tour-2026',
    status: 'active', createdAt: new Date()
  })
  return NextResponse.json({ id: result.insertedId })
}