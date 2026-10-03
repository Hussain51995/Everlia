import { createAdminClient } from "@/lib/supabase/admin";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { mailProviderConfigUpdateSchema } from "@/lib/validations/cards";
import { firstZodError } from "@/lib/validations/errors";
import type { MailProviderConfig } from "@/lib/types/cards";

export async function GET() {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("mail_provider_configs")
      .select(
        `
        *,
        provider:mail_providers (
          id,
          slug,
          name,
          is_active
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      return apiError(
        { code: "MAIL_CONFIG_ERROR", message: error.message },
        500
      );
    }

    return apiSuccess({
      configs: (data ?? []) as MailProviderConfig[],
      envProvider: process.env.MAIL_PROVIDER || "postgrid",
      envMode: process.env.POSTGRID_MODE || "test",
      hasPostgridKey: Boolean(process.env.POSTGRID_API_KEY),
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load mail provider config",
      },
      500
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const parsed = mailProviderConfigUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid mail provider config")
      );
    }

    const admin = createAdminClient();
    const { data: provider } = await admin
      .from("mail_providers")
      .select("id, slug")
      .eq("slug", parsed.data.provider_slug)
      .maybeSingle();

    if (!provider) {
      return apiError(
        { code: "PROVIDER_NOT_FOUND", message: "Provider not found" },
        404
      );
    }

    await admin
      .from("mail_provider_configs")
      .update({ is_active: false })
      .eq("is_active", true);

    const { data: existing } = await admin
      .from("mail_provider_configs")
      .select("id")
      .eq("provider_id", provider.id)
      .eq("environment", parsed.data.environment)
      .maybeSingle();

    let config;
    if (existing) {
      const { data, error } = await admin
        .from("mail_provider_configs")
        .update({
          is_active: true,
          settings: parsed.data.settings ?? {},
        })
        .eq("id", existing.id)
        .select(
          `
          *,
          provider:mail_providers (
            id,
            slug,
            name,
            is_active
          )
        `
        )
        .single();
      if (error) {
        return apiError(
          { code: "MAIL_CONFIG_ERROR", message: error.message },
          500
        );
      }
      config = data;
    } else {
      const { data, error } = await admin
        .from("mail_provider_configs")
        .insert({
          provider_id: provider.id,
          environment: parsed.data.environment,
          settings: parsed.data.settings ?? {},
          is_active: true,
        })
        .select(
          `
          *,
          provider:mail_providers (
            id,
            slug,
            name,
            is_active
          )
        `
        )
        .single();
      if (error) {
        return apiError(
          { code: "MAIL_CONFIG_ERROR", message: error.message },
          500
        );
      }
      config = data;
    }

    return apiSuccess({ config: config as MailProviderConfig });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update mail provider config",
      },
      500
    );
  }
}
