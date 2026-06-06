import { MongoClient } from 'mongodb'
import { nanoid } from 'nanoid'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

type SeedDoc = {
  _id: string
  [key: string]: unknown
}

const uri = process.env.MONGODB_URI!

const EVENT_ID = 'nova-world-tour-2026'

const EVENT = {
  _id: EVENT_ID,
  name: 'NOVA World Tour 2026',
  venue: 'Apex Arena',
  date: '2026-06-15',
  startTime: '18:00',
  endTime: '23:00',
  totalCapacity: 15000,
  currentAttendance: 9800,
  status: 'live',
  createdAt: new Date()
}

const ZONES = [
  { _id: 'zone-a', eventId: EVENT_ID, name: 'Tech & Experience', label: 'Zone A', capacity: 2000, currentPeople: 1420, safeCapacity: 1600, riskScore: 45, riskLevel: 'normal', crowdDensity: 0.71, incidents: 0, updatedAt: new Date() },
  { _id: 'zone-b', eventId: EVENT_ID, name: 'Photo & Fan Zone', label: 'Zone B', capacity: 1500, currentPeople: 1380, safeCapacity: 1200, riskScore: 82, riskLevel: 'critical', crowdDensity: 0.92, incidents: 1, updatedAt: new Date() },
  { _id: 'zone-c', eventId: EVENT_ID, name: 'Food Court', label: 'Zone C', capacity: 3000, currentPeople: 2100, safeCapacity: 2400, riskScore: 55, riskLevel: 'attention', crowdDensity: 0.70, incidents: 0, updatedAt: new Date() },
  { _id: 'zone-d', eventId: EVENT_ID, name: 'Merchandise', label: 'Zone D', capacity: 2000, currentPeople: 1800, safeCapacity: 1600, riskScore: 78, riskLevel: 'high', crowdDensity: 0.90, incidents: 0, updatedAt: new Date() },
  { _id: 'zone-e', eventId: EVENT_ID, name: 'Main Stage', label: 'Zone E', capacity: 10000, currentPeople: 7200, safeCapacity: 8000, riskScore: 30, riskLevel: 'normal', crowdDensity: 0.72, incidents: 0, updatedAt: new Date() }
]

const VENDORS = [
  { _id: 'v-samsung', eventId: EVENT_ID, zoneId: 'zone-a', name: 'Samsung Experience', type: 'experience', serviceRate: 4, activeCounters: 3, maxCounters: 5, popularityScore: 65, riskScore: 30, updatedAt: new Date() },
  { _id: 'v-photobooth', eventId: EVENT_ID, zoneId: 'zone-b', name: 'Photobooth', type: 'experience', serviceRate: 2, activeCounters: 2, maxCounters: 4, popularityScore: 92, riskScore: 74, updatedAt: new Date() },
  { _id: 'v-ramen', eventId: EVENT_ID, zoneId: 'zone-c', name: 'Noodle/Ramen Stall', type: 'food', serviceRate: 6, activeCounters: 2, maxCounters: 4, popularityScore: 88, riskScore: 68, updatedAt: new Date() },
  { _id: 'v-fries', eventId: EVENT_ID, zoneId: 'zone-c', name: 'Fries Stall', type: 'food', serviceRate: 8, activeCounters: 2, maxCounters: 3, popularityScore: 72, riskScore: 42, updatedAt: new Date() },
  { _id: 'v-fanmsg', eventId: EVENT_ID, zoneId: 'zone-b', name: 'Fan Message WriteUp', type: 'experience', serviceRate: 3, activeCounters: 4, maxCounters: 6, popularityScore: 78, riskScore: 38, updatedAt: new Date() },
  { _id: 'v-lightstick', eventId: EVENT_ID, zoneId: 'zone-d', name: 'Lightstick Store', type: 'merch', serviceRate: 10, activeCounters: 3, maxCounters: 5, popularityScore: 95, riskScore: 80, updatedAt: new Date() },
  { _id: 'v-merch', eventId: EVENT_ID, zoneId: 'zone-d', name: 'Merchandise Counter', type: 'merch', serviceRate: 5, activeCounters: 4, maxCounters: 8, popularityScore: 90, riskScore: 76, updatedAt: new Date() },
  { _id: 'v-foodcart', eventId: EVENT_ID, zoneId: 'zone-c', name: 'Explore Food Cart', type: 'food', serviceRate: 7, activeCounters: 1, maxCounters: 2, popularityScore: 60, riskScore: 28, updatedAt: new Date() },
  { _id: 'v-ar', eventId: EVENT_ID, zoneId: 'zone-a', name: 'AR Selfie Zone', type: 'experience', serviceRate: 3, activeCounters: 5, maxCounters: 8, popularityScore: 70, riskScore: 25, updatedAt: new Date() },
  { _id: 'v-stage', eventId: EVENT_ID, zoneId: 'zone-e', name: 'Main Stage', type: 'experience', serviceRate: 999, activeCounters: 1, maxCounters: 1, popularityScore: 100, riskScore: 10, updatedAt: new Date() }
]

const QUEUES = [
  { _id: nanoid(), vendorId: 'v-samsung',    zoneId: 'zone-a', currentLength: 12,  predictedWait: 5,  confidence: 0.88, serviceRate: 4,  arrivalRate: 3,  updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-photobooth', zoneId: 'zone-b', currentLength: 48,  predictedWait: 24, confidence: 0.79, serviceRate: 2,  arrivalRate: 4,  updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-ramen',      zoneId: 'zone-c', currentLength: 35,  predictedWait: 18, confidence: 0.84, serviceRate: 6,  arrivalRate: 8,  updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-fries',      zoneId: 'zone-c', currentLength: 18,  predictedWait: 9,  confidence: 0.91, serviceRate: 8,  arrivalRate: 6,  updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-fanmsg',     zoneId: 'zone-b', currentLength: 22,  predictedWait: 11, confidence: 0.82, serviceRate: 3,  arrivalRate: 3,  updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-lightstick', zoneId: 'zone-d', currentLength: 52,  predictedWait: 22, confidence: 0.75, serviceRate: 10, arrivalRate: 14, updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-merch',      zoneId: 'zone-d', currentLength: 44,  predictedWait: 20, confidence: 0.77, serviceRate: 5,  arrivalRate: 9,  updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-foodcart',   zoneId: 'zone-c', currentLength: 8,   predictedWait: 5,  confidence: 0.93, serviceRate: 7,  arrivalRate: 4,  updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-ar',         zoneId: 'zone-a', currentLength: 20,  predictedWait: 10, confidence: 0.86, serviceRate: 3,  arrivalRate: 3,  updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-stage',      zoneId: 'zone-e', currentLength: 0,   predictedWait: 0,  confidence: 1.00, serviceRate: 999,arrivalRate: 0,  updatedAt: new Date() }
]

const INVENTORY = [
  { _id: nanoid(), vendorId: 'v-ramen',      itemName: 'Tonkotsu Ramen',     currentStock: 85,  initialStock: 300, baseSalesRate: 1.8, lowStockThreshold: 50, updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-ramen',      itemName: 'Miso Ramen',         currentStock: 40,  initialStock: 200, baseSalesRate: 1.2, lowStockThreshold: 30, updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-fries',      itemName: 'Classic Fries',      currentStock: 220, initialStock: 400, baseSalesRate: 2.1, lowStockThreshold: 60, updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-fries',      itemName: 'Cheese Fries',       currentStock: 95,  initialStock: 200, baseSalesRate: 1.4, lowStockThreshold: 40, updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-lightstick', itemName: 'NOVA Official Stick', currentStock: 120, initialStock: 800, baseSalesRate: 3.5, lowStockThreshold: 80, updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-merch',      itemName: 'Tour T-Shirt',       currentStock: 200, initialStock: 600, baseSalesRate: 2.8, lowStockThreshold: 80, updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-merch',      itemName: 'Photo Card Pack',    currentStock: 310, initialStock: 500, baseSalesRate: 2.2, lowStockThreshold: 80, updatedAt: new Date() },
  { _id: nanoid(), vendorId: 'v-foodcart',   itemName: 'Tteokbokki',         currentStock: 150, initialStock: 250, baseSalesRate: 1.0, lowStockThreshold: 40, updatedAt: new Date() }
]

const SCHEDULES = [
  { _id: nanoid(), eventId: EVENT_ID, actName: 'Gates Open',         zone: 'All',    startTime: '17:00', endTime: '18:00', expectedCrowdIncrease: 30 },
  { _id: nanoid(), eventId: EVENT_ID, actName: 'Opening Act — LUNA', zone: 'Zone E', startTime: '18:30', endTime: '19:30', expectedCrowdIncrease: 20 },
  { _id: nanoid(), eventId: EVENT_ID, actName: 'Break',              zone: 'All',    startTime: '19:30', endTime: '20:00', expectedCrowdIncrease: -15 },
  { _id: nanoid(), eventId: EVENT_ID, actName: 'Merch Rush',         zone: 'Zone D', startTime: '19:30', endTime: '20:00', expectedCrowdIncrease: 40 },
  { _id: nanoid(), eventId: EVENT_ID, actName: 'NOVA Headline Show', zone: 'Zone E', startTime: '20:00', endTime: '22:00', expectedCrowdIncrease: 60 },
  { _id: nanoid(), eventId: EVENT_ID, actName: 'Encore',             zone: 'Zone E', startTime: '22:10', endTime: '22:30', expectedCrowdIncrease: 10 }
]

async function seed() {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(process.env.MONGODB_DB || 'eventpilot')

  console.log('Dropping collections...')
  for (const col of ['events','zones','vendors','queues','inventory','itineraries','alerts','agent_actions','schedules','attendees']) {
    await db.collection(col).drop().catch(() => {})
  }

  console.log('Seeding events...')
  await db.collection<SeedDoc>('events').insertOne(EVENT)

  console.log('Seeding zones...')
  await db.collection<SeedDoc>('zones').insertMany(ZONES)

  console.log('Seeding vendors...')
  await db.collection<SeedDoc>('vendors').insertMany(VENDORS)

  console.log('Seeding queues...')
  await db.collection<SeedDoc>('queues').insertMany(QUEUES)

  console.log('Seeding inventory...')
  await db.collection<SeedDoc>('inventory').insertMany(INVENTORY)

  console.log('Seeding schedules...')
  await db.collection<SeedDoc>('schedules').insertMany(SCHEDULES)

  console.log('Creating indexes...')
  await db.collection('zones').createIndex({ eventId: 1 })
  await db.collection('vendors').createIndex({ eventId: 1, zoneId: 1 })
  await db.collection('queues').createIndex({ vendorId: 1 })
  await db.collection('inventory').createIndex({ vendorId: 1 })
  await db.collection('alerts').createIndex({ eventId: 1, status: 1 })
  await db.collection('itineraries').createIndex({ sessionId: 1 })
  await db.collection('agent_actions').createIndex({ eventId: 1, createdAt: -1 })

  console.log('Seed complete!')
  await client.close()
}

seed().catch(console.error)