/**
 * @deprecated Orchestration is unified in TravelOrchestrator (lib/orchestrator.ts).
 *
 * Run the web app instead:
 *   npm run dev
 *   POST http://localhost:3000/api/optimize
 *
 * Traces appear at: https://wandb.ai/chinmayks2013-student/TravelRook/weave
 * (requires WANDB_API_KEY in .env.local)
 */
import sys

print(
    "coordinator_agent.py is deprecated.\n"
    "TravelRooks uses a single TypeScript coordinator (lib/orchestrator/coordinator.ts).\n"
    "Start the app with: npm run dev\n"
    "Weave traces: https://wandb.ai/chinmayks2013-student/TravelRook/weave\n",
    file=sys.stderr,
)
sys.exit(0)
