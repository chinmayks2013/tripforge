import {
  isWeaveConfigured,
  projectRef,
  weaveProjectUrl,
  wandbProjectUrl,
} from "@/lib/wandb/weave-client";

export const dynamic = "force-dynamic";
export async function GET() {
  const configured = isWeaveConfigured();
  return Response.json({
    configured,
    project: projectRef(),
    weaveUrl: weaveProjectUrl(),
    runsUrl: wandbProjectUrl(),
    hint: configured
      ? "Run a trip search — traces appear in Weave within ~30s"
      : "Copy .env.example to .env.local and add your key locally (never commit it)",
  });
}
