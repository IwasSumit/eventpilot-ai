# EventPilot AI

## Agentic Crowd & Experience Optimizer for Live Events

### Google Cloud Rapid Agent Hackathon 2026 · MongoDB Partner Track

**Live Demo:** https://eventpilot-ai-xi.vercel.app/

**Demo Video:** [Youtube Video](https://youtu.be/8ykNtJUB9ns)

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

<p align="center">
  <img
    src="https://github.com/user-attachments/assets/465b4c34-378c-4056-958c-bcd952bcdf03"
    alt="EventPilot Architecture"
    height="500"
    width="500"
  />
</p>


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

[Mathematical Foundations of EventPilot AI](./docs/OPS_RESEARCH_FOUNDATIONS.md)

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

<img width="1918" height="963" alt="Screenshot 2026-06-10 213712" src="https://github.com/user-attachments/assets/881ed736-2458-487f-b45d-8e035d6c3d67" />

### Vendor Dashboard

<img width="1918" height="970" alt="Screenshot 2026-06-10 213602" src="https://github.com/user-attachments/assets/3b077ca3-f80e-4c9a-822e-98ad21c48b31" />

### Attendee Planner

<img width="1918" height="962" alt="Screenshot 2026-06-10 213757" src="https://github.com/user-attachments/assets/d9620ba7-9d4e-4b46-a137-e81ffe9930d6" />

<img width="1918" height="962" alt="Screenshot 2026-06-10 213853" src="https://github.com/user-attachments/assets/61f8bbc8-c199-4ced-888b-ec32280d5d14" />

<img width="1918" height="967" alt="Screenshot 2026-06-10 213906" src="https://github.com/user-attachments/assets/84683cc2-f0a6-40bf-af55-8d00a19c7d2b" />

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
