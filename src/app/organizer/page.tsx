
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import Link from 'next/link'

interface Zone {
  _id: string; name: string; label: string; crowdDensity: number
  riskScore: number; riskLevel: string; currentPeople: number
  computedRisk: { score: number; level: string }
}
interface Alert {
  _id: string; title: string; severity: string
  recommendation: string; autoFired?: boolean; zone?: string
}
interface AgentAction {
  _id: string; recommendation: string; mcpQueryUsed: string
  approved: boolean; trigger: string; createdAt?: string
}
interface ImpactData {
  prevDensity: number; newDensity: number
  prevRisk: number; newRisk: number; newRiskLevel: string
}

const COLORS: Record<string, string> = {
  normal: '#10b981', attention: '#f59e0b', high: '#f97316', critical: '#ef4444'
}

export default function OrganizerDashboard() {
  const [data, setData] = useState<{
    zones: Zone[]; alerts: Alert[]
    recentActions: AgentAction[]
    eventRisk: { score: number; level: string }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [approvedAlerts, setApprovedAlerts] = useState<Set<string>>(new Set())
  const [impactMap, setImpactMap] = useState<Record<string, ImpactData>>({})
  const [approving, setApproving] = useState<string | null>(null)

  // tracks when we last auto-fired for each zone
  // prevents firing every 10 seconds when zone is critical
  const lastFiredRef = useRef<Record<string, number>>({})

  const fetchDashboard = useCallback(async () => {
    const res = await fetch('/api/organizer/dashboard')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  const runTick = useCallback(async () => {
    await fetch('/api/simulation/tick', { method: 'POST' })
    const res = await fetch('/api/organizer/dashboard')
    const fresh = await res.json()
    setData(fresh)
    setLoading(false)

    // auto-fire recommendations with 2-minute cooldown per zone
    // without this cooldown, every 10-second tick fires a paid agent call
    if (fresh?.zones) {
      const now = Date.now()
      const COOLDOWN = 2 * 60 * 1000  // 2 minutes between auto-fires per zone

      for (const zone of fresh.zones) {
        if (zone.computedRisk?.score >= 80 && zone.riskLevel === 'critical') {
          const alreadyAlerted = fresh.alerts?.some(
            (a: Alert) => a.zone === zone._id
          )
          const lastFired = lastFiredRef.current[zone._id] || 0
          const cooledDown = (now - lastFired) > COOLDOWN

          // only fire if: no active alert AND cooldown passed
          if (!alreadyAlerted && cooledDown) {
            lastFiredRef.current[zone._id] = now
            fetch('/api/organizer/recommend', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                zoneId: zone._id,
                riskData: zone.computedRisk
              })
            }).catch(console.error)
          }
        }
      }
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
    // simulation tick every 10s — keeps data fresh
    // UI poll every 15s — reduced from 5s, still feels live, saves requests
    const tickInterval = setInterval(runTick, 10000)
    const pollInterval = setInterval(fetchDashboard, 15000)
    return () => {
      clearInterval(tickInterval)
      clearInterval(pollInterval)
    }
  }, [fetchDashboard, runTick])

  const getRecommendation = async (zone: Zone) => {
    setGenerating(zone._id)
    await fetch('/api/organizer/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zoneId: zone._id, riskData: zone.computedRisk })
    })
    fetchDashboard()
    setGenerating(null)
  }

  const acknowledgeAlert = async (alert: Alert) => {
    setApproving(alert._id)
    setApprovedAlerts(prev => new Set([...prev, alert._id]))
    try {
      const res = await fetch(`/api/organizer/alerts/${alert._id}/acknowledge`, {
        method: 'POST'
      })
      const result = await res.json()
      if (result.zone && result.previousRisk !== undefined) {
        setImpactMap(prev => ({
          ...prev,
          [result.zone]: {
            prevDensity: result.previousDensity,
            newDensity: result.newDensity,
            prevRisk: result.previousRisk,
            newRisk: result.newRisk,
            newRiskLevel: result.newRiskLevel
          }
        }))
      }
      setTimeout(() => fetchDashboard(), 800)
    } finally {
      setApproving(null)
    }
  }

  const pendingCount = data?.recentActions?.filter(a => !a.approved).length ?? 0

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-400">
      Loading operational data...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <div>
          <Link href="/" className="text-gray-500 text-sm hover:text-gray-300">
            ← EventPilot AI
          </Link>
          <h1 className="text-lg font-semibold mt-1">Organizer Operations</h1>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="text-xs px-3 py-1 rounded-full bg-purple-900 text-purple-300">
              {pendingCount} agent decision{pendingCount > 1 ? 's' : ''} pending
            </div>
          )}
          <span className="text-xs text-gray-500">Simulation every 10s</span>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${data?.eventRisk.level === 'critical' ? 'bg-red-900 text-red-300' :
            data?.eventRisk.level === 'high' ? 'bg-orange-900 text-orange-300' :
              data?.eventRisk.level === 'attention' ? 'bg-yellow-900 text-yellow-300' :
                'bg-green-900 text-green-300'
            }`}>
            Event Risk: {data?.eventRisk.score ?? '—'} — {data?.eventRisk.level}
          </div>
        </div>
      </header>

      <div className="p-8 grid grid-cols-12 gap-6">

        {/* Zone cards */}
        <section className="col-span-8">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
            Zone Status
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {data?.zones.map(zone => {
              const impact = impactMap[zone._id]
              return (
                <div key={zone._id}
                  className="bg-gray-900 rounded-2xl p-5 border border-gray-800 hover:border-gray-700 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-medium">{zone.name}</div>
                      <div className="text-xs text-gray-500">
                        {zone.label} · {zone.currentPeople} people
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: COLORS[zone.riskLevel] + '20',
                        color: COLORS[zone.riskLevel]
                      }}>
                      {zone.riskLevel}
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Crowd density</span>
                      <span>{Math.round(zone.crowdDensity * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, zone.crowdDensity * 100)}%`,
                          backgroundColor:
                            zone.crowdDensity > 0.9 ? '#ef4444' :
                              zone.crowdDensity > 0.7 ? '#f97316' : '#10b981'
                        }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div
                          className="text-2xl font-bold"
                          style={{ color: COLORS[zone.riskLevel] }}
                        >
                          {zone.computedRisk?.score ?? zone.riskScore}
                        </div>

                        <span
                          className="text-gray-500 text-xs cursor-help"
                          title={
                            (zone.computedRisk?.score ?? zone.riskScore) > 50
                              ? 'Critical: Immediately click "Get AI Recommendation" and take action.'
                              : (zone.computedRisk?.score ?? zone.riskScore) > 45
                                ? 'Attention: Monitor closely. Consider getting AI recommendation.'
                                : 'Normal: Crowd levels are fine.'
                          }
                        >
                          ⓘ
                        </span>
                      </div>
                      {impact && (
                        <div className="text-xs text-green-400 leading-tight">
                          ↓ {impact.prevDensity}→{impact.newDensity}
                          <div className="text-gray-600">agent via MCP</div>
                        </div>
                      )}
                    </div>
                    {(zone.computedRisk?.score ?? 0) >= 40 && (
                      <button
                        onClick={() => getRecommendation(zone)}
                        disabled={generating === zone._id}
                        className="px-3 py-1.5 text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded-lg transition-colors">
                        {generating === zone._id ? 'AI thinking...' : 'Get AI Recommendation'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="col-span-4 space-y-6">

          <div>
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
              Active Alerts
            </h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {!data?.alerts.length && (
                <div className="text-sm text-gray-600 text-center py-6">
                  No active alerts — agent is watching
                </div>
              )}
              {data?.alerts.map(alert => (
                <div key={alert._id}
                  className={`p-4 rounded-xl border text-sm transition-all duration-300 ${approvedAlerts.has(alert._id)
                    ? 'bg-green-950 border-green-800'
                    : alert.severity === 'critical'
                      ? 'bg-red-950 border-red-800'
                      : 'bg-yellow-950 border-yellow-800'
                    }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium flex-1 text-white">{alert.title}</div>
                    {alert.autoFired && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 text-purple-300 shrink-0">
                        Auto
                      </span>
                    )}
                    {approvedAlerts.has(alert._id) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-300 shrink-0">
                        ✓ Applied
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 text-xs mb-3 leading-relaxed prose prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {alert.recommendation}
                    </ReactMarkdown>
                  </div>
                  {!approvedAlerts.has(alert._id) && (
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => acknowledgeAlert(alert)}
                        disabled={approving === alert._id}
                        className="px-3 py-1 text-xs bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded text-white transition-colors">
                        {approving === alert._id ? 'Agent executing...' : 'Approve & Apply'}
                      </button>
                      <button
                        onClick={() => acknowledgeAlert(alert)}
                        className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors">
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
              Agent Actions (MCP)
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {!data?.recentActions?.length && (
                <div className="text-sm text-gray-600 text-center py-4">
                  No agent actions yet
                </div>
              )}
              {data?.recentActions?.map(action => {
                let displayText = action.recommendation
                try {
                  const parsed = JSON.parse(action.recommendation)
                  displayText = parsed.recommendation || parsed.title || action.recommendation
                } catch { /* plain text */ }

                const triggerLabel =
                  action.trigger === 'human_approval_agent_execution' ? 'Agent executed — crowd' :
                    action.trigger?.startsWith('zone_risk') ? 'Auto — zone risk' :
                      action.trigger === 'human_approval' ? 'Human approved' :
                        action.trigger === 'vendor_open_counter' ? 'Counter opened' :
                          action.trigger === 'vendor_restock' ? 'Item restocked' :
                            'Agent action'

                return (
                  <div key={action._id}
                    className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${action.approved
                        ? 'bg-green-900 text-green-300'
                        : 'bg-purple-900 text-purple-300'
                        }`}>
                        {action.approved ? '✓ ' : ''}{triggerLabel}
                      </span>
                      <span className="text-gray-600">
                        {action.createdAt
                          ? new Date(action.createdAt).toLocaleTimeString()
                          : ''}
                      </span>
                    </div>
                    <div className="text-gray-300 mb-1.5 leading-relaxed">{displayText}</div>
                    <div className="text-gray-500 text-xs">
                      AI used live crowd and queue information to execute this action.
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </aside>

        <section className="col-span-12">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
            Zone Risk Overview
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            This chart compares the current operational risk score across all event zones.
            Higher scores indicate areas requiring immediate attention due to crowd density,
            congestion, or safety concerns.
          </p>
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.zones.map(z => ({
                name: z.label,
                risk: z.computedRisk?.score ?? z.riskScore,
                density: Math.round(z.crowdDensity * 100)
              }))}>
                <XAxis
                  dataKey="name"
                  label={{
                    value: 'Event Zones',
                    position: 'insideBottom',
                    offset: -5,
                    fill: '#9ca3af',
                    fontSize: 12
                  }}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis
                  label={{
                    value: 'Risk Score',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#9ca3af',
                    fontSize: 12
                  }}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: '#a8aeba',
                    border: '1px solid #374151'
                  }}
                  formatter={(value) => [`${value}/100`, 'Risk Score']}
                />
                <Bar dataKey="risk" radius={[4, 4, 0, 0]}>
                  {data?.zones.map((z, i) => (
                    <Cell key={i} fill={COLORS[z.riskLevel]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

      </div>
    </div>
  )
}