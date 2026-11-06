import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import type { OrganizationBranding } from "@/lib/types/cards";

const emptyBranding = (organizationId: string): OrganizationBranding => ({
  organization_id: organizationId,
  logo_url: null,
  sender_display_name: null,
  return_address_line1: null,
  return_address_line2: null,
  return_city: null,
  return_province_or_state: null,
  return_postal_or_zip: null,
  return_country_code: "US",
});

const optionalUrl = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}, z.union([z.string().url("Enter a valid image URL"), z.null()]).optional());

const optionalName = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}, z.union([z.string().max(120), z.null()]).optional());

const patchSchema = z.object({
  logo_url: optionalUrl,
  sender_display_name: optionalName,
});

export async function GET() {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("organization_branding")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    if (error) {
      return apiError({ code: "BRANDING_ERROR", message: error.message }, 500);
    }

    return apiSuccess({
      branding: (data as OrganizationBranding | null) ?? emptyBranding(ctx.organizationId),
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load branding",
      },
      500
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Invalid branding payload",
        },
        400
      );
    }

    const updates: Record<string, string | null> = {
      organization_id: ctx.organizationId,
    };
    if (parsed.data.logo_url !== undefined) {
      updates.logo_url = parsed.data.logo_url;
    }
    if (parsed.data.sender_display_name !== undefined) {
      updates.sender_display_name = parsed.data.sender_display_name;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("organization_branding")
      .upsert(updates, { onConflict: "organization_id" })
      .select("*")
      .single();

    if (error) {
      return apiError({ code: "BRANDING_ERROR", message: error.message }, 500);
    }

    return apiSuccess({
      branding: data as OrganizationBranding,
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to save branding",
      },
      500
    );
  }
}
