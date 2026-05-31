import { NextRequest } from "next/server";
import { parseNaturalLanguage, applyAssumptionUpdates } from "@/lib/parser";
import { TravelOrchestrator } from "@/lib/orchestrator";
import { AgentEvent, Assumption, UserLocation } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query, assumptions, refine, userLocation } = body as {
    query?: string;
    assumptions?: Assumption[];
    refine?: boolean;
    userLocation?: UserLocation;
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AgentEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      try {
        if (refine && assumptions) {
          const baseRequest = parseNaturalLanguage(query ?? "");
          const updatedRequest = {
            ...applyAssumptionUpdates(baseRequest, assumptions),
            userLocation,
          };
          const orchestrator = new TravelOrchestrator((event) => {
            send(event);
          });
          const result = await orchestrator.rerunAgents(updatedRequest);
          send({
            type: "orchestrator_complete",
            data: { result, refine: true },
            timestamp: Date.now(),
          });
        } else if (query) {
          const request = { ...parseNaturalLanguage(query), userLocation };
          const orchestrator = new TravelOrchestrator((event) => {
            send(event);
          });
          const result = await orchestrator.optimize(request);
          send({
            type: "orchestrator_complete",
            data: { result },
            timestamp: Date.now(),
          });
        } else {
          send({
            type: "error",
            data: { message: "Query is required" },
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        send({
          type: "error",
          data: { message: String(err) },
          timestamp: Date.now(),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
