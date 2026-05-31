import { isWeaveConfigured, weaveProjectUrl } from "@/lib/wandb/weave-client";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    configured: isWeaveConfigured(),
    project: process.env.WANDB_PROJECT ?? "chinmayks2013/tripforge",
    weaveUrl: weaveProjectUrl(),
    hint: isWeaveConfigured()
      ? "Run a trip search — traces appear in Weave within ~30s"
      : "Set WANDB_API_KEY in .env.local (tracing on by default)",
  });
}
