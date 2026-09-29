import { apiError, apiSuccess, unauthorizedError } from "@/lib/api/response";
import { getSessionPayload } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSessionPayload();

    if (!session) {
      return unauthorizedError();
    }

    return apiSuccess({ session });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load session",
      },
      500
    );
  }
}
