
import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/client'

export async function GET() {
  const zones = await getCollection('zones').then(c =>
    c.find({ eventId: 'nova-world-tour-2026' }).toArray())
  return NextResponse.json(zones)
}