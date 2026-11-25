import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { listAdminProviderCatalog } from "@/lib/property-intelligence/admin/provider-catalog";

export async function GET() {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    return apiSuccess({
      providers: listAdminProviderCatalog(),
      note: "Only registered adapters are listed. Secrets are never exposed.",
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load providers",
      },
      500
    );
  }
}
