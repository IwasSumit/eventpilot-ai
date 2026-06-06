export interface ZoneRiskInput {
  crowdDensity: number       // currentPeople / safeCapacity
  incidentCount: number
  maxQueueWait: number       // minutes
  minutesToNextAct: number
}

export interface ZoneRiskOutput {
  score: number              // 0-100
  level: 'normal' | 'attention' | 'high' | 'critical'
  crowdDensityScore: number
  incidentScore: number
  queuePressureScore: number
  scheduleUrgencyScore: number
}

export function computeZoneRisk(input: ZoneRiskInput): ZoneRiskOutput {
  // Crowd density: 0-60% = 0-40pts, 60-80% = 40-70pts, 80%+ = 70-100pts
  const crowdDensityScore = Math.min(100,
    input.crowdDensity < 0.6 ? input.crowdDensity * 67 :
    input.crowdDensity < 0.8 ? 40 + (input.crowdDensity - 0.6) * 150 :
    70 + (input.crowdDensity - 0.8) * 150
  )

  // Incident score: 0 incidents = 0, 1 = 40, 2 = 70, 3+ = 100
  const incidentScore = Math.min(100, input.incidentCount * 35)

  // Queue pressure: wait > 20 min = high pressure
  const queuePressureScore = Math.min(100, (input.maxQueueWait / 25) * 100)

  // Schedule urgency: higher when act starts within 30 min
  const scheduleUrgencyScore = input.minutesToNextAct <= 0 ? 100 :
    input.minutesToNextAct <= 15 ? 80 :
    input.minutesToNextAct <= 30 ? 50 : 10

  const score = Math.round(
    crowdDensityScore * 0.45 +
    incidentScore     * 0.25 +
    queuePressureScore * 0.20 +
    scheduleUrgencyScore * 0.10
  )

  const level = score >= 80 ? 'critical' :
    score >= 65 ? 'high' :
    score >= 45 ? 'attention' : 'normal'

  return { score, level, crowdDensityScore, incidentScore, queuePressureScore, scheduleUrgencyScore }
}

export interface QueuePredictionInput {
  queueLength: number
  serviceRate: number      // customers per minute per counter
  activeCounters: number
  popularityScore: number  // 0-100
  walkingDelayMinutes: number
  extraStaffBoost: number  // 0-5 extra minutes saved
}

export interface QueuePredictionOutput {
  predictedWaitMinutes: number
  confidence: number
  rawWait: number
  surgeAdjustment: number
}

export function predictQueueWait(input: QueuePredictionInput): QueuePredictionOutput {
  // Little's Law inspired: L / (lambda * s) where s = servers
  const rawWait = input.queueLength / (input.serviceRate * input.activeCounters)

  // Popularity surge adjustment: popular booths see higher effective arrival rate
  const popularitySurge = (input.popularityScore / 100) * 2

  // Apply adjustments
  const predictedWaitMinutes = Math.max(0, Math.round(
    rawWait + popularitySurge + input.walkingDelayMinutes - input.extraStaffBoost
  ))

  // Confidence degrades with queue volatility and popularity
  const confidence = Math.max(0.5, 1 - (input.popularityScore / 300) - (input.queueLength / 400))

  return {
    predictedWaitMinutes,
    confidence: Math.round(confidence * 100) / 100,
    rawWait: Math.round(rawWait),
    surgeAdjustment: Math.round(popularitySurge * 10) / 10
  }
}

export interface InventoryForecastInput {
  currentStock: number
  baseSalesRate: number    // units per minute
  queueLength: number
  popularityScore: number  // 0-100
}

export interface InventoryForecastOutput {
  stockOutMinutes: number  // 9999 = will not stock out
  adjustedSalesRate: number
  demandMultiplier: number
  riskLevel: 'safe' | 'watch' | 'urgent' | 'critical'
}

export function forecastInventory(input: InventoryForecastInput): InventoryForecastOutput {
  const demandMultiplier = 1 +
    (input.queueLength / 100) +
    (input.popularityScore / 200)

  const adjustedSalesRate = input.baseSalesRate * demandMultiplier

  const stockOutMinutes = adjustedSalesRate > 0
    ? Math.round(input.currentStock / adjustedSalesRate)
    : 9999

  const riskLevel = stockOutMinutes < 10  ? 'critical' :
    stockOutMinutes < 20 ? 'urgent' :
    stockOutMinutes < 45 ? 'watch' : 'safe'

  return {
    stockOutMinutes,
    adjustedSalesRate: Math.round(adjustedSalesRate * 10) / 10,
    demandMultiplier: Math.round(demandMultiplier * 100) / 100,
    riskLevel
  }
}

export interface ActivityScoreInput {
  interestScore: number    // user preference match, 0-100
  popularityScore: number  // booth popularity, 0-100
  timeFitScore: number     // how well it fits the schedule, 0-100
  lowCrowdScore: number    // inverse of crowd density, 0-100
  distanceScore: number    // inverse of walking distance, 0-100
  urgencyScore: number     // time pressure, 0-100
  userWeights?: {
    avoidCrowds?: number   // multiplier for lowCrowdScore weight
    fastMover?: number     // multiplier for distanceScore weight
  }
}

export function scoreActivity(input: ActivityScoreInput): number {
  // Base weights
  let wInterest = 0.35
  let wPopularity = 0.15
  let wTimeFit = 0.20
  let wLowCrowd = 0.15
  let wDistance = 0.10
  let wUrgency = 0.05

  // Dynamic weight adaptation based on user preferences
  if (input.userWeights?.avoidCrowds && input.userWeights.avoidCrowds > 1) {
    const boost = (input.userWeights.avoidCrowds - 1) * 0.10
    wLowCrowd += boost
    wPopularity -= boost / 2
    wDistance -= boost / 2
  }

  const score = Math.round(
    input.interestScore  * wInterest +
    input.popularityScore * wPopularity +
    input.timeFitScore   * wTimeFit +
    input.lowCrowdScore  * wLowCrowd +
    input.distanceScore  * wDistance +
    input.urgencyScore   * wUrgency
  )

  return Math.min(100, Math.max(0, score))
}

export function computeEventRisk(
  zoneRiskScores: number[],
  vendorRiskScores: number[],
  incidentSeverity: number  // 0-100
): { score: number; level: string } {
  const avgZone   = zoneRiskScores.reduce((a, b) => a + b, 0) / (zoneRiskScores.length || 1)
  const avgVendor = vendorRiskScores.reduce((a, b) => a + b, 0) / (vendorRiskScores.length || 1)

  const score = Math.round(
    avgZone   * 0.45 +
    avgVendor * 0.35 +
    incidentSeverity * 0.20
  )

  const level = score >= 75 ? 'critical' :
    score >= 60 ? 'high' :
    score >= 40 ? 'attention' : 'normal'

  return { score, level }
}