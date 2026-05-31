# TripForge — AI Travel Cost Optimizer

A multi-agent AI platform that minimizes total trip cost by orchestrating 11 specialized agents in parallel. Enter a natural language request and the system immediately begins planning — no forms required.

## Architecture

```
User Query (NL) → Parser → Orchestrator → 11 Parallel Agents → 3 Plans (Budget/Balanced/Luxury)
                                ↓
                    Assumptions Checklist ← Real-time SSE Updates
```

### Specialized Agents

| Agent | Responsibility |
|-------|---------------|
| **Flight Agent** | Cheapest routes, hidden-city tickets, fare timing |
| **Lodging Agent** | Hotels, hostels, extended-stay discounts |
| **Transport Agent** | Transit bundles, rideshare vs public transit |
| **Parking Agent** | Garage discounts, park-and-ride strategies |
| **Attractions Agent** | Free entry days, combo tickets, off-peak pricing |
| **Discounts Agent** | Promo codes, seasonal deals, student discounts |
| **Memberships Agent** | AAA, Costco, credit card travel perks |
| **Local Passes Agent** | City passes, museum bundles, transit day passes |
| **Group Agent** | Group rates, shared accommodation splits |
| **Routing Agent** | Optimal day-by-day routing to minimize transit |
| **Budget Agent** | Cross-category optimization and trade-off analysis |

### Journey Map & Step-by-Step Itinerary

- **Satellite map** with Esri World Imagery tiles and labeled overlays
- **Animated route** showing stop-to-stop path with a pulsing traveler marker
- **Play tour** mode auto-advances through stops every 2.5 seconds
- **Day-by-day tabs** with weather forecast (temp, humidity, wind, UV, rain)
- **Detailed stops** including gas stations, rest stops, attractions, food, lodging
- **Travel segments** showing distance, duration, and transport mode between stops

- **Natural language input** — describe your trip in plain English
- **Smart assumptions** — missing info filled with reasonable defaults + interactive checklist
- **Real-time agent visualization** — watch 11 agents work concurrently via SSE
- **Three travel styles** — Budget, Balanced, and Luxury plans with appropriate cost scaling
- **Transparent cost breakdown** — every dollar accounted for with savings sources
- **Hidden opportunity discovery** — local passes, membership benefits, free-entry days, group rates
- **Live re-optimization** — updating the assumptions checklist triggers selective agent reruns

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Example Queries

- "Trip to Paris for 2 people next month"
- "Family of 4 to Tokyo for a week, budget under $5000"
- "Weekend in Boston, solo, love museums and food"
- "Group of 6 to Barcelona, we have AAA membership"

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion** (agent animations)
- **Server-Sent Events** (real-time agent streaming)

## Project Structure

```
├── app/
│   ├── page.tsx              # Main UI
│   ├── api/optimize/route.ts # SSE streaming endpoint
│   └── layout.tsx
├── components/
│   ├── ChatInput.tsx         # Natural language input
│   ├── AgentDashboard.tsx    # Live agent status grid
│   ├── PlanComparison.tsx    # Budget/Balanced/Luxury cards
│   ├── CostBreakdown.tsx     # Transparent cost bars
│   ├── OpportunitiesPanel.tsx # Hidden savings list
│   └── AssumptionsChecklist.tsx # Interactive assumptions
└── lib/
    ├── types.ts              # Shared type definitions
    ├── parser.ts             # NL query parser + assumptions
    ├── orchestrator.ts       # Central agent orchestrator
    └── agents/index.ts       # All 11 agent implementations
```

## Hackathon Demo Flow

1. Enter a natural language trip request
2. Watch 11 agents activate in parallel on the dashboard
3. Review the assumptions checklist — confirm, reject, or modify
4. Compare Budget, Balanced, and Luxury plans side-by-side
5. Explore cost breakdowns and hidden opportunity savings
6. Modify an assumption → agents rerun → costs update in real time
