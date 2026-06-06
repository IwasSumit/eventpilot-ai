
import { NextResponse } from 'next/server'
import { runSimulationTick } from '@/lib/simulation'

export async function POST() {
  try {
    await runSimulationTick()
    return NextResponse.json({
      success:   true,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Simulation tick failed:', error)
    return NextResponse.json(
      { error: 'Simulation tick failed' },
      { status: 500 }
    )
  }
}