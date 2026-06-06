export interface BaseDocument {
  _id: string
}

export interface EventDoc extends BaseDocument {
  name: string
  venue: string
  startTime: Date
  endTime: Date
  status: string
}

export interface ZoneDoc extends BaseDocument {
  eventId: string
  name: string
  safeCapacity: number
  currentPeople: number
  riskLevel: string
  updatedAt: Date
}

export interface VendorDoc extends BaseDocument {
  eventId: string
  zoneId: string
  name: string
  type: string
  serviceRate: number
  activeCounters: number
  maxCounters: number
  popularityScore: number
  riskScore: number
  updatedAt: Date
}

export interface QueueDoc extends BaseDocument {
  vendorId: string
  currentLength: number
  updatedAt: Date
}

export interface InventoryDoc extends BaseDocument {
  vendorId: string
  itemName: string
  currentStock: number
  initialStock: number
  baseSalesRate: number
  lowStockThreshold: number
  updatedAt: Date
}

export interface ScheduleDoc extends BaseDocument {
  eventId: string
  title: string
  category: string
  startTime: Date
  endTime: Date
  priorityScore: number
}

export interface AttendeeDoc extends BaseDocument {
  name: string
  preferences: string[]
  dislikes: string[]
  maxWaitTolerance: number
}

export interface ItineraryDoc extends BaseDocument {
  attendeeId: string
  activities: string[]
  generatedAt: Date
}

export interface AlertDoc extends BaseDocument {
  type: string
  severity: string
  message: string
  createdAt: Date
}

export interface AgentActionDoc extends BaseDocument {
  actionType: string
  targetId: string
  reasoning: string
  createdAt: Date
}