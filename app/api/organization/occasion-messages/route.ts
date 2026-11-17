import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, validationError } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import {
  buildEffectiveOccasionMessages,
  deleteOrgOccasionMessage,
  listOrgOccasionMessageRows,
  upsertOrgOccasionMessage,
} from "@/lib/campaigns/org-messages";
import { orgOccasionMessageUpsertSchema } from "@/lib/validations/org-messages";

export async function GET() {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const supabase = createClient();
    const rows = await listOrgOccasionMessageRows(
      supabase,
      ctx.organizationId
    );
    const messages = buildEffectiveOccasionMessages(rows);

    return apiSuccess({ messages, customizedCount: rows.length });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load occasion messages",
      },
      500
    );
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const body = await request.json().catch(() => null);
    const parsed = orgOccasionMessageUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        parsed.error.issues[0]?.message ?? "Invalid message payload"
      );
    }

    const supabase = createClient();
    const row = await upsertOrgOccasionMessage(supabase, {
      organizationId: ctx.organizationId,
      occasionSlug: parsed.data.occasionSlug,
      greetingTemplate: parsed.data.greetingTemplate,
      messageTemplate: parsed.data.messageTemplate,
      footerTemplate: parsed.data.footerTemplate ?? null,
    });

    const rows = await listOrgOccasionMessageRows(
      supabase,
      ctx.organizationId
    );
    const messages = buildEffectiveOccasionMessages(rows);
    const effective =
      messages.find((m) => m.occasionSlug === row.occasion_slug) ?? null;

    return apiSuccess({ message: effective, row });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to save occasion message",
      },
      500
    );
  }
}

export async function POST(request: Request) {
  return PUT(request);
}

export async function DELETE(request: Request) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug")?.trim();
    if (!slug) {
      return validationError("slug query parameter is required");
    }

    const supabase = createClient();
    await deleteOrgOccasionMessage(supabase, ctx.organizationId, slug);

    const rows = await listOrgOccasionMessageRows(
      supabase,
      ctx.organizationId
    );
    const messages = buildEffectiveOccasionMessages(rows);
    const effective =
      messages.find((m) => m.occasionSlug === slug) ?? null;

    return apiSuccess({ message: effective, reset: true });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to reset occasion message",
      },
      500
    );
  }
}
