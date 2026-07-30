import { estimatePopulation } from "@/lib/db";
import { verifyTurnstile } from "@/lib/turnstile";
import { parseEstimateFilters } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const filters = parseEstimateFilters(payload.filters);
    const remoteIp =
      request.headers.get("CF-Connecting-IP") ??
      request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
      "unknown";
    const verified = await verifyTurnstile({
      token: payload.turnstileToken,
      action: "turnstile-spin-v2",
      remoteIp,
    });
    if (!verified) {
      return Response.json(
        { error: "Verification failed. Please try again." },
        { status: 403 },
      );
    }
    return Response.json(await estimatePopulation(filters));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The estimate could not be calculated.";
    const isInputError =
      message.startsWith("Choose") ||
      message.startsWith("Minimum") ||
      message.startsWith("Maximum") ||
      message.startsWith("The estimate request");

    return Response.json(
      {
        error: isInputError
          ? message
          : "The aggregate data service is temporarily unavailable. Please retry.",
      },
      {
        status: isInputError ? 400 : 503,
      },
    );
  }
}
