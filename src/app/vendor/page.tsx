
'use client'

import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'

const VENDORS = [
  { id: 'v-ramen', name: 'Ramen Stall' },
  { id: 'v-fries', name: 'Fries Stall' },
  { id: 'v-lightstick', name: 'Lightstick Store' },
  { id: 'v-merch', name: 'Merchandise' },
  { id: 'v-photobooth', name: 'Photobooth' },
  { id: 'v-samsung', name: 'Samsung' }
]

interface InventoryItem {
  itemName: string; currentStock: number; initialStock: number
  forecast: { stockOutMinutes: number; riskLevel: string }
}
interface VendorData {
  vendor: { name: string; activeCounters: number; maxCounters: number; popularityScore: number }
  queue: { currentLength: number } | null
  queuePrediction: { predictedWaitMinutes: number; confidence: number } | null
  inventory: InventoryItem[]
  vendorRisk: number
}

export default function VendorDashboard() {
  const [selectedId, setSelectedId] = useState('v-ramen')
  const [data, setData] = useState<VendorData | null>(null)
  const [loading, setLoading] = useState(false)
  const [adviceMap, setAdviceMap] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<{ t: string; q: number }[]>([])
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [restockingItem, setRestockingItem] = useState<string | null>(null)
  const [openingCounter, setOpeningCounter] = useState(false)
  const [generatingAdvice, setGeneratingAdvice] = useState(false)

  const loadVendor = useCallback((id: string) => {
    setLoading(true)
    setActionMsg(null)

    fetch(`/api/vendor/${id}`)
      .then(r => r.json())
      .then(d => {
        setData(d)

        setHistory(prev => [
          ...prev.slice(-19),
          {
            t: new Date().toLocaleTimeString('en', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            q: d.queue?.currentLength ?? 0
          }
        ])

        setLoading(false)
      })
  }, [])

  useEffect(() => {
    loadVendor(selectedId)
    setHistory([])
  }, [selectedId, loadVendor])

  useEffect(() => {
    const interval = setInterval(() => loadVendor(selectedId), 10000)
    return () => clearInterval(interval)
  }, [selectedId, loadVendor])

  const getAdvice = async () => {
    if (!data || generatingAdvice) return

    setGeneratingAdvice(true)

    try {
      const res = await fetch('/api/vendor/advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vendorId: selectedId,
          vendorData: data
        })
      })

      if (res.ok) {
        const result = await res.json()

        setAdviceMap(prev => ({
          ...prev,
          [selectedId]: result.advice
        }))
      }
    } finally {
      setGeneratingAdvice(false)
    }
  }

  // agent reads vendor+queue via MCP → increases counter → writes back via MCP
  const openCounter = async () => {
    if (!data) return
    setOpeningCounter(true)
    const res = await fetch('/api/vendor/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId: selectedId, action: 'open_counter' })
    })
    const result = await res.json()
    if (result.success) {
      setActionMsg(`✓ ${result.message}`)
      setTimeout(() => loadVendor(selectedId), 600)
    } else {
      setActionMsg(result.message || 'Could not open counter')
    }
    setOpeningCounter(false)
    setTimeout(() => setActionMsg(null), 5000)
  }

  // agent reads inventory via MCP → resets stock → writes back via MCP
  const restockItem = async (itemName: string) => {
    setRestockingItem(itemName)
    const res = await fetch('/api/vendor/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId: selectedId, action: 'restock', itemName })
    })
    const result = await res.json()
    if (result.success) {
      setActionMsg(`✓ ${result.message}`)
      setTimeout(() => loadVendor(selectedId), 600)
    }
    setRestockingItem(null)
    setTimeout(() => setActionMsg(null), 5000)
  }

  const riskColor = !data ? '#6b7280' :
    data.vendorRisk >= 75 ? '#ef4444' :
      data.vendorRisk >= 55 ? '#f97316' :
        data.vendorRisk >= 35 ? '#f59e0b' : '#10b981'

  const canOpenCounter = data
    ? data.vendor.activeCounters < data.vendor.maxCounters
    : false

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <div>
          <Link href="/" className="text-gray-500 text-sm hover:text-gray-300">← EventPilot AI</Link>
          <h1 className="text-lg font-semibold mt-1">Vendor Dashboard</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {VENDORS.map(v => (
            <button key={v.id} onClick={() => setSelectedId(v.id)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${selectedId === v.id ? 'bg-teal-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}>
              {v.name}
            </button>
          ))}
        </div>
      </header>

      {/* Action feedback — shows what agent wrote via MCP */}
      {actionMsg && (
        <div className="mx-8 mt-4 px-4 py-3 bg-green-950 border border-green-800 rounded-xl text-sm text-green-300">
          {actionMsg}
        </div>
      )}

      {loading
        ? <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
        : data && (
          <div className="p-8 grid grid-cols-12 gap-6">

            {/* Risk + counter control */}
            <div className="col-span-3 bg-gray-900 rounded-2xl p-6 border border-gray-800 flex flex-col items-center justify-center">
              <div className="text-xs text-gray-500 uppercase mb-2">Vendor Risk</div>
              <div className="text-5xl font-bold mb-2" style={{ color: riskColor }}>
                {data.vendorRisk}
              </div>
              <div className="text-sm mb-4" style={{ color: riskColor }}>
                {data.vendorRisk >= 75 ? 'Critical' :
                  data.vendorRisk >= 55 ? 'High' :
                    data.vendorRisk >= 35 ? 'Attention' : 'Normal'}
              </div>
              <div className="w-full">
                <div className="text-xs text-gray-500 text-center mb-2">
                  {data.vendor.activeCounters}/{data.vendor.maxCounters} counters
                </div>
                <div className="flex gap-1 justify-center mb-3">
                  {Array.from({ length: data.vendor.maxCounters }).map((_, i) => (
                    <div key={i} className={`w-4 h-4 rounded-sm ${i < data.vendor.activeCounters ? 'bg-teal-500' : 'bg-gray-700'
                      }`} />
                  ))}
                </div>
                {canOpenCounter ? (
                  <button onClick={openCounter} disabled={openingCounter}
                    className="w-full px-3 py-2 text-xs bg-teal-700 hover:bg-teal-600 disabled:opacity-50 rounded-lg text-white transition-colors">
                    {openingCounter ? 'Agent executing...' : '+ Open Counter'}
                  </button>
                ) : (
                  <div className="text-xs text-gray-600 text-center">All counters open</div>
                )}
              </div>
              <div className="mt-3 text-xs text-gray-600 text-center">
                Pop: {data.vendor.popularityScore}/100
              </div>
            </div>

            {/* Queue */}
            <div className="col-span-3 bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <div className="text-xs text-gray-500 uppercase mb-4">Live Queue</div>
              <div className="text-3xl font-bold mb-1">{data.queue?.currentLength ?? 0}</div>
              <div className="text-xs text-gray-500 mb-4">people in queue</div>
              <div className="text-3xl font-bold mb-1">{data.queuePrediction?.predictedWaitMinutes ?? 0} min</div>
              <div className="text-xs text-gray-500">
                {Math.round((data.queuePrediction?.confidence ?? 0) * 100)}% confidence
              </div>
            </div>

            {/* Queue trend */}
            <div className="col-span-6 bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <div className="text-xs text-gray-500 uppercase mb-4">Queue Trend</div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={history}>
                  <XAxis dataKey="t" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
                  <Line type="monotone" dataKey="q" stroke="#14b8a6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Inventory with restock buttons */}
            <div className="col-span-8 bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <div className="text-xs text-gray-500 uppercase mb-4">Inventory Forecast</div>
              <div className="space-y-4">
                {data.inventory.map(item => {
                  const pct = Math.round(item.currentStock / item.initialStock * 100)
                  const color =
                    item.forecast.riskLevel === 'critical' ? '#ef4444' :
                      item.forecast.riskLevel === 'urgent' ? '#f97316' :
                        item.forecast.riskLevel === 'watch' ? '#f59e0b' : '#10b981'
                  const needsRestock =
                    item.forecast.riskLevel === 'critical' ||
                    item.forecast.riskLevel === 'urgent'

                  return (
                    <div key={item.itemName}>
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span className="text-gray-300">{item.itemName}</span>
                        <div className="flex items-center gap-2">
                          <span style={{ color }}>
                            {item.forecast.stockOutMinutes === 9999
                              ? 'Safe'
                              : `~${item.forecast.stockOutMinutes} min`}
                          </span>
                          {needsRestock && (
                            <button
                              onClick={() => restockItem(item.itemName)}
                              disabled={restockingItem === item.itemName}
                              className="px-2 py-0.5 text-xs bg-orange-700 hover:bg-orange-600 disabled:opacity-50 rounded text-white transition-colors">
                              {restockingItem === item.itemName ? 'Agent writing...' : 'Restock'}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-xs text-gray-500 w-24 text-right">
                          {item.currentStock} / {item.initialStock}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* AI advice */}
            <div className="col-span-4 bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <div className="text-xs text-gray-500 uppercase mb-4">AI Recommendation</div>
              {generatingAdvice && (
                <div className="mb-4 p-3 rounded-lg bg-teal-950 border border-teal-800 text-teal-300 text-sm animate-pulse">
                  🤖 EventPilot AI is analyzing queue conditions, inventory levels, and vendor risk...
                </div>
              )}
              {adviceMap[selectedId] ? (
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {adviceMap[selectedId]}
                </p>
              ) : (
                <div className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Agent reads live queue and inventory from MongoDB MCP,
                  then generates specific operational advice.
                </div>
              )}
              <button
                onClick={getAdvice}
                disabled={generatingAdvice}
                className="mt-4 w-full px-4 py-2 text-sm rounded-xl text-white transition-all disabled:opacity-70 disabled:cursor-not-allowed bg-teal-700 hover:bg-teal-600"
              >
                {generatingAdvice ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating Advice...
                  </span>
                ) : (
                  adviceMap[selectedId]
                    ? 'Refresh Advice'
                    : 'Get AI Advice'
                )}
              </button>
            </div>

          </div>
        )}
    </div>
  )
}