
import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <div>
          <span className="text-xl font-semibold text-white">EventPilot AI</span>
          <span className="ml-3 text-xs text-gray-500">
            Google Cloud Agent Builder · Gemini 3 Flash · MongoDB MCP
          </span>
        </div>
        <div className="flex gap-3">
          <Link href="/organizer" className="px-4 py-2 text-sm text-gray-300 hover:text-white">Organizer</Link>
          <Link href="/vendor"    className="px-4 py-2 text-sm text-gray-300 hover:text-white">Vendor</Link>
          <Link href="/attendee"  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg">Plan My Visit</Link>
        </div>
      </nav>
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950 border border-blue-800 text-blue-400 text-xs mb-8">
          NOVA World Tour 2026 · Live Now
        </div>
        <h1 className="text-5xl font-bold text-white max-w-3xl leading-tight mb-6">
          Operational intelligence<br/>for live events
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mb-10">
          Real-time crowd management, vendor intelligence, and AI-optimized attendee
          itineraries — powered by Google Cloud Agent Builder and MongoDB MCP.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/organizer" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium">Organizer Dashboard</Link>
          <Link href="/vendor"    className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium">Vendor Dashboard</Link>
          <Link href="/attendee"  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium">Plan My Visit</Link>
        </div>
      </section>
      <section className="grid grid-cols-4 divide-x divide-gray-800 border-t border-gray-800">
        {[['15,000','Attendees'],['10','Activities tracked'],['5','Zones monitored'],['10s','Simulation interval']].map(([val, label]) => (
          <div key={label} className="py-8 text-center">
            <div className="text-3xl font-bold text-white">{val}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </section>
    </main>
  )
}