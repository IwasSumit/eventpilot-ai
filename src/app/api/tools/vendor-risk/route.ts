
import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/client'

export async function GET(req: NextRequest) {
  const vendorId = req.nextUrl.searchParams.get('vendorId')
  const filter   = vendorId ? { _id: vendorId } : { eventId: 'nova-world-tour-2026' }
  const vendors  = await getCollection<Record<string, unknown>>('vendors')
    .then(c => c.find(filter as object).toArray())
  return NextResponse.json(vendors)
}