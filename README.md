# EventPilot AI

## Agentic Crowd & Experience Optimizer for Live Events

### Google Cloud Rapid Agent Hackathon 2026 · MongoDB Partner Track

**Live Demo:** https://eventpilot-ai.vercel.app

**Demo Video:** https://youtu.be/YOUR_VIDEO_ID

---

## What It Does

EventPilot AI is an operational intelligence platform for live events.

It monitors crowd density, vendor queues, inventory levels, and attendee movement in real time, then uses Google Cloud Agent Builder and Gemini to generate actionable recommendations for organizers, vendors, and attendees.

The platform combines deterministic operational intelligence with AI reasoning to improve event flow, reduce congestion, and enhance attendee experience.

### Key Capabilities

* Live crowd monitoring and risk scoring
* Vendor queue and inventory intelligence
* Personalized attendee itinerary generation
* Agent-generated operational recommendations
* Human-in-the-loop approval workflows
* MongoDB MCP-powered operational memory

---

## User Experiences

### Organizer Dashboard

* Real-time crowd monitoring
* Multi-zone risk scoring
* AI-generated operational recommendations
* Human approval workflow
* Crowd mitigation impact tracking

### Vendor Dashboard

* Queue monitoring
* Inventory forecasting
* Restocking recommendations
* AI-generated business advice
* Operational performance insights

### Attendee Planner

* Personalized itineraries
* Crowd-aware route optimization
* Wait-time minimization
* AI-generated visit planning
* Progress tracking across activities

---

## Tech Stack

| Component       | Technology                                      |
| --------------- | ----------------------------------------------- |
| Agent Framework | Google Cloud Agent Builder (Managed Agents API) |
| AI Model        | Gemini-3-flash-preview                          |
| Partner MCP     | MongoDB MCP Server                              |
| Database        | MongoDB Atlas                                   |
| Frontend        | Next.js 15                                      |
| Backend         | Next.js API Routes                              |
| Hosting         | Vercel                                          |
| Charts          | Recharts                                        |
| Styling         | Tailwind CSS                                    |

---

## Architecture

```text
Attendee / Vendor / Organizer UI
              |
              v
        Next.js Frontend
              |
              v
        Next.js API Routes
              |
              v
   Google Cloud Agent Builder
              |
              v
       Gemini-3-flash-preview
              |
              v
        MongoDB MCP Server
              |
              v
          MongoDB Atlas
```

---

## Agentic Workflow

1. Live event simulation updates operational state every 10 seconds
2. Deterministic algorithms calculate operational scores
3. Threshold breaches trigger Agent Builder
4. Gemini analyzes operational context
5. Recommendations are generated
6. Recommendations are stored through MongoDB MCP
7. Human operators approve actions
8. Approved actions modify live system state
9. Updated metrics feed back into the next decision cycle

---

## MongoDB MCP Integration

EventPilot AI uses MongoDB MCP as its operational memory layer.

The Agent Builder agent can:

* Read live zone metrics
* Read vendor inventory levels
* Read queue information
* Read attendee itineraries
* Store recommendations
* Update operational actions
* Record approved interventions
* Persist itinerary progress

This allows agent decisions to remain grounded in live event data rather than static prompts.

---

## Operational Intelligence (The Science)

These calculations are deterministic and explainable.

Gemini interprets the results but does not perform the calculations.

### Zone Risk (MCDA Weighted Scoring)

```text
zoneRisk =
 crowdDensity × 0.45 +
 incidents × 0.25 +
 queuePressure × 0.20 +
 scheduleUrgency × 0.10
```

### Queue Wait Prediction (Little's Law Inspired)

```text
predictedWait =
 queueLength / (serviceRate × counters)
 + popularitySurge
 + walkingDelay
```

### Inventory Forecast

```text
demandMultiplier =
 1 + queueLength/100 + popularityScore/200

stockOutMinutes =
 currentStock / (baseSalesRate × demandMultiplier)
```

### Attendee Itinerary Scoring (MCDA)

```text
activityScore =
 interest × 0.35 +
 popularity × 0.15 +
 timeFit × 0.20 +
 lowCrowd × 0.15 +
 distance × 0.10 +
 urgency × 0.05
```

---

## Screenshots

### Organizer Dashboard

![Organizer Dashboard](docs/organizer-dashboard.png)

### Vendor Dashboard

![Vendor Dashboard](docs/vendor-dashboard.png)

### Attendee Planner

![Attendee Planner](docs/attendee-planner.png)

---

## Project Structure

```text
src/
├── app/
│   ├── organizer/
│   ├── vendor/
│   ├── attendee/
│   └── api/
│
├── lib/
│   ├── agent-builder/
│   ├── mongodb/
│   ├── computation/
│   └── simulation/
│
└── components/
```

---

## Local Development

### Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/eventpilot-ai.git
cd eventpilot-ai
```

### Install Dependencies

```bash
npm install
```

### Configure Environment

```bash
cp .env.example .env.local
```

Populate `.env.local` with your credentials.

### Seed Database

```bash
npm run seed
```

### Start Application

```bash
npm run dev
```

Application runs on:

```text
http://localhost:3000
```

---

## Why This Matters

Large live events often suffer from:

* Crowd congestion
* Long vendor queues
* Inventory shortages
* Poor attendee navigation

EventPilot AI combines operational analytics, agentic workflows, and MCP-powered memory to help event operators make better decisions in real time.

---

## License

MIT License
