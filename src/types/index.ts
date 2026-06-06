export interface EventDoc {
  _id: string
  name: string
  venue: string
  date: string
  startTime: string
  endTime: string
  totalCapacity: number
  currentAttendance: number
  status: 'upcoming' | 'live' | 'ended'
  createdAt: Date
}

export interface ZoneDoc {
  _id: string
  eventId: string
  name: string
  label: string         // e.g. "Zone A"
  capacity: number
  currentPeople: number
  safeCapacity: number
  riskScore: number     // 0-100
  riskLevel: 'normal' | 'attention' | 'high' | 'critical'
  crowdDensity: number  // 0-1+
  incidents: number
  updatedAt: Date
}

export interface VendorDoc {
  _id: string
  eventId: string
  zoneId: string
  name: string
  type: 'food' | 'merch' | 'experience'
  serviceRate: number   // customers per minute
  activeCounters: number
  maxCounters: number
  popularityScore: number // 0-100
  riskScore: number
  updatedAt: Date
}

export interface InventoryDoc {
  _id: string
  vendorId: string
  itemName: string
  currentStock: number
  initialStock: number
  baseSalesRate: number  // units per minute
  lowStockThreshold: number
  updatedAt: Date
}

export interface QueueDoc {
  _id: string
  vendorId: string
  zoneId: string
  currentLength: number
  predictedWait: number   // minutes
  confidence: number      // 0-1
  serviceRate: number
  arrivalRate: number
  updatedAt: Date
}

export interface AttendeeDoc {
  _id: string
  sessionId: string
  preferences: string[]
  timeBudgetMinutes: number
  currentZone: string
  updatedAt: Date
}

export interface ItineraryDoc {
  _id: string
  attendeeId: string
  sessionId: string
  activities: ItineraryActivity[]
  totalTime: number
  generatedAt: Date
  agentReasoning: string
}

export interface ItineraryActivity {
  activityId: string
  activityName: string
  zone: string
  startTime: string
  endTime: string
  estimatedWait: number
  confidence: number
  crowdWarning?: string
  score: number
}

export interface AlertDoc {
  _id: string
  eventId: string
  type: 'zone_risk' | 'vendor_risk' | 'inventory' | 'crowd'
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  recommendation: string
  zone?: string
  vendorId?: string
  status: 'active' | 'acknowledged' | 'resolved'
  approvedBy?: string
  createdAt: Date
}

export interface AgentActionDoc {
  _id: string
  eventId: string
  trigger: string
  inputData: Record<string, unknown>
  recommendation: string
  mcpQueryUsed: string
  approved: boolean
  createdAt: Date
}

export interface ScheduleDoc {
  _id: string
  eventId: string
  actName: string
  zone: string
  startTime: string
  endTime: string
  expectedCrowdIncrease: number
}

export interface ActivityDef {
  id: string
  name: string
  zone: string
  vendorId: string
  basePopularity: number
  walkingDistanceFromEntrance: number // 1-10
  isMandatory?: boolean
}