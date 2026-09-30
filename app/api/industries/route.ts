import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("industries")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("name");

    if (error) {
      return apiError(
        { code: "INDUSTRIES_FETCH_FAILED", message: error.message },
        500
      );
    }

    return apiSuccess(data ?? []);
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load industries",
      },
      500
    );
  }
}
