
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const OPTIONS = [
  'Ramen', 'Fries', 'Photobooth', 'Lightstick', 'Merchandise',
  'AR Selfie', 'Fan Message', 'Samsung Experience', 'Food Cart', 'Main Stage'
]

const ACTIVITY_VENDOR_MAP: Record<string, string> = {
  'Ramen Stall': 'v-ramen',
  'Fries Stall': 'v-fries',
  'Photobooth': 'v-photobooth',
  'Lightstick Store': 'v-lightstick',
  'Merchandise Counter': 'v-merch',
  'AR Selfie Zone': 'v-ar',
  'Fan Message WriteUp': 'v-fanmsg',
  'Samsung Experience': 'v-samsung',
  'Food Cart': 'v-foodcart',
  'Main Stage': 'v-stage'
}

interface Activity {
  activityId: string; activityName: string; zone: string
  startTime: string; endTime: string; estimatedWait: number
  confidence: number; crowdWarning?: string; score: number
}
interface Result {
  sessionId: string
  itinerary: { activities: Activity[]; totalTime: number; reasoning: string }
}

const ZONE_COLORS: Record<string, string> = {
  'zone-a': '#3b82f6', 'zone-b': '#a855f7', 'zone-c': '#f97316',
  'zone-d': '#14b8a6', 'zone-e': '#f59e0b'
}

const ACTIVITY_ICONS: Record<string, string> = {
  'Ramen Stall': '🍜',
  'Fries Stall': '🍟',
  'Photobooth': '📸',
  'Lightstick Store': '💡',
  'Merchandise Counter': '🛍️',
  'Samsung Experience': '📱',
  'Main Stage': '🎤',
  'Food Cart': '🌭',
  'AR Selfie Zone': '🤳',
  'Fan Message WriteUp': '✍️'
}

export default function AttendeePlanner() {
  const [prefs, setPrefs] = useState<string[]>(['Ramen', 'Photobooth', 'Lightstick'])
  const [budget, setBudget] = useState(120)
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<Set<number>>(new Set())
  const [doneMsg, setDoneMsg] = useState<string | null>(null)
  const [loadingStage, setLoadingStage] = useState('')

  useEffect(() => {
    const savedItinerary = localStorage.getItem('eventpilot-itinerary')
    const savedDone = localStorage.getItem('eventpilot-itinerary-done')

    if (savedItinerary) {
      setResult(JSON.parse(savedItinerary))
    }

    if (savedDone) {
      setDone(new Set(JSON.parse(savedDone)))
    }
  }, [])

  const toggle = (p: string) =>
    setPrefs(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  const generate = async () => {
    setLoading(true)
    setDone(new Set())
    localStorage.removeItem('eventpilot-itinerary-done')

    setLoadingStage('Analyzing crowd conditions...')

    setTimeout(() => {
      setLoadingStage('Reading live queue data...')
    }, 1200)

    setTimeout(() => {
      setLoadingStage('Building optimized itinerary...')
    }, 2400)

    const res = await fetch('/api/attendee/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preferences: prefs,
        timeBudgetMinutes: budget
      })
    })

    if (res.ok) {
      const itinerary = await res.json()

      setResult(itinerary)

      localStorage.setItem(
        'eventpilot-itinerary',
        JSON.stringify(itinerary)
      )

      localStorage.setItem(
        'eventpilot-itinerary-done',
        JSON.stringify([])
      )
    }

    setLoading(false)
    setLoadingStage('')
  }

  // agent reads queue via MCP → decrements count → writes back via MCP
  const markDone = async (index: number, activity: Activity) => {
    if (done.has(index) || !result) return
    setDone(prev => {
      const updated = new Set([...prev, index])

      localStorage.setItem(
        'eventpilot-itinerary-done',
        JSON.stringify(Array.from(updated))
      )

      return updated
    })

    const vendorId = ACTIVITY_VENDOR_MAP[activity.activityName]
    if (vendorId) {
      const res = await fetch('/api/attendee/activity-done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          sessionId: result.sessionId,
          activityName: activity.activityName
        })
      })
      if (res.ok) {
        setDoneMsg(`✓ ${activity.activityName} complete — queue updated via MCP`)
        setTimeout(() => setDoneMsg(null), 3000)
      }
    }
  }

  const completedCount = done.size
  const totalCount = result?.itinerary.activities.length ?? 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <div>
          <Link href="/" className="text-gray-500 text-sm hover:text-gray-300">← EventPilot AI</Link>
          <h1 className="text-lg font-semibold mt-1">Plan My Visit</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">NOVA World Tour 2026</div>
          {result && (
            <div className="text-xs px-3 py-1 rounded-full bg-teal-900 text-teal-300">
              {completedCount}/{totalCount} done
            </div>
          )}
        </div>
      </header>

      {doneMsg && (
        <div className="mx-8 mt-4 px-4 py-3 bg-green-950 border border-green-800 rounded-xl text-sm text-green-300">
          {doneMsg}
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 w-[420px]">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>

            <h2 className="text-xl font-semibold text-center mb-2">
              EventPilot AI Agent
            </h2>

            <p className="text-gray-400 text-center text-sm mb-6">
              Creating your personalized itinerary
            </p>

            <div className="space-y-3">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 animate-pulse w-full" />
              </div>

              <div className="text-sm text-center text-purple-300">
                {loadingStage}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto p-8">
        {!result ? (
          <div className="space-y-8">
            <div>
              <h2 className="text-base font-medium mb-1">What do you want to do?</h2>
              <p className="text-sm text-gray-500 mb-4">Select everything you are interested in</p>
              <div className="flex flex-wrap gap-2">
                {OPTIONS.map(p => (
                  <button key={p} onClick={() => toggle(p)}
                    className={`px-4 py-2 rounded-xl text-sm transition-colors ${prefs.includes(p) ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-base font-medium mb-1">How long do you have?</h2>
              <div className="flex items-center gap-4">
                <input type="range" min={60} max={300} step={15} value={budget}
                  onChange={e => setBudget(Number(e.target.value))} className="flex-1" />
                <span className="font-medium w-20">
                  {Math.floor(budget / 60)}h {budget % 60}m
                </span>
              </div>
            </div>
            <button
              onClick={generate}
              disabled={loading || !prefs.length}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-2xl font-medium text-lg transition-all duration-300"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{loadingStage}</span>
                </div>
              ) : (
                'Generate My Itinerary'
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your optimised plan</h2>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                  <div className="text-xs text-gray-500">Activities</div>
                  <div className="text-2xl font-bold">
                    {result.itinerary.activities.length}
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                  <div className="text-xs text-gray-500">Duration</div>
                  <div className="text-2xl font-bold">
                    {result.itinerary.totalTime}m
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                  <div className="text-xs text-gray-500">Completion</div>
                  <div className="text-2xl font-bold">
                    {completedCount}/{totalCount}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setResult(null)
                  setDone(new Set())

                  localStorage.removeItem('eventpilot-itinerary')
                  localStorage.removeItem('eventpilot-itinerary-done')
                }}
                className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 transition-colors">
                Start over
              </button>
            </div>

            {totalCount > 0 && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{completedCount} of {totalCount} activities</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }} />
                </div>
              </div>
            )}

            <div className="space-y-3">
              {result.itinerary.activities.map((activity, i) => {
                const isDone = done.has(i)
                return (
                  <div key={i}
                    className={`flex gap-4 p-4 rounded-2xl border transition-all duration-300 ${isDone ? 'bg-gray-900/40 border-gray-700 opacity-60' : 'bg-gray-900 border-gray-800'
                      }`}>
                    <div className="text-right min-w-16">
                      <div className={`text-sm font-medium ${isDone ? 'line-through text-gray-600' : ''}`}>
                        {activity.startTime}
                      </div>
                      <div className="text-xs text-gray-500">{activity.endTime}</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <div className="w-px flex-1 bg-gray-700" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">

                        <div className="flex items-start gap-3">

                          <div className="text-2xl">
                            {ACTIVITY_ICONS[activity.activityName] || '🎯'}
                          </div>

                          <div>
                            <div
                              className={`font-semibold ${isDone ? 'line-through text-gray-500' : 'text-white'
                                }`}
                            >
                              {activity.activityName}
                            </div>

                            <div className="text-xs text-gray-500 mt-1">
                              Priority Score: {activity.score}
                            </div>
                          </div>

                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: (ZONE_COLORS[activity.zone] || '#6b7280') + '25',
                              color: ZONE_COLORS[activity.zone] || '#6b7280'
                            }}>
                            {activity.zone?.replace('zone-', 'Zone ').toUpperCase()}
                          </span>
                          {!isDone ? (
                            <button onClick={() => markDone(i, activity)}
                              className="text-xs px-2 py-0.5 bg-teal-800 hover:bg-teal-700 text-teal-300 rounded transition-colors">
                              Done
                            </button>
                          ) : (
                            <span className="text-xs text-green-500">✓</span>
                          )}
                        </div>
                      </div>
                      {!isDone && (
                        <div className="flex gap-3 text-xs text-gray-500">
                          <span>~{activity.estimatedWait} min wait</span>
                          <span>{Math.round(activity.confidence * 100)}% confidence</span>
                        </div>
                      )}
                      {!isDone && activity.crowdWarning && (
                        <div className="mt-1 text-xs text-amber-400">{activity.crowdWarning}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {result.itinerary.reasoning && (
              <div className="p-4 bg-purple-950 border border-purple-800 rounded-2xl">
                <div className="text-xs text-purple-400 uppercase tracking-wide mb-2">
                  Gemini 3 reasoning
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {result.itinerary.reasoning}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}