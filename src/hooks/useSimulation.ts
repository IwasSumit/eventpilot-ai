import { useEffect, useCallback } from 'react'

export function useSimulation(onTick?: () => void) {
  const tick = useCallback(async () => {
    await fetch('/api/simulation/tick', { method: 'POST' })
    onTick?.()
  }, [onTick])

  useEffect(() => {
    const intervalMs = parseInt(process.env.NEXT_PUBLIC_SIMULATION_INTERVAL || '10000')
    const interval = setInterval(tick, intervalMs)
    return () => clearInterval(interval)
  }, [tick])
}