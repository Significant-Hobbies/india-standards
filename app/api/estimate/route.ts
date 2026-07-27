import { estimatePopulation } from "@/lib/db";
import { parseEstimateFilters } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const filters = parseEstimateFilters(await request.json());
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
