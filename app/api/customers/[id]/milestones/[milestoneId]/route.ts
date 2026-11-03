import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { customerMilestoneUpdateSchema } from "@/lib/validations/campaigns";
import { firstZodError } from "@/lib/validations/errors";
import type { CustomerMilestone } from "@/lib/types/cards";

type Params = { params: { id: string; milestoneId: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const body = await request.json().catch(() => null);
    const parsed = customerMilestoneUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid milestone data")
      );
    }

    const input = parsed.data;
    const updates: Record<string, unknown> = {};
    if (input.milestone_type !== undefined)
      updates.milestone_type = input.milestone_type;
    if (input.anchor_date !== undefined) updates.anchor_date = input.anchor_date;
    if (input.label !== undefined) updates.label = input.label?.trim() || null;
    if (input.property_type !== undefined)
      updates.property_type = input.property_type?.trim() || null;
    if (input.recurs_annually !== undefined)
      updates.recurs_annually = input.recurs_annually;
    if (input.metadata !== undefined) updates.metadata = input.metadata;
    if (input.is_active !== undefined) updates.is_active = input.is_active;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("customer_milestones")
      .update(updates)
      .eq("id", params.milestoneId)
      .eq("customer_id", params.id)
      .eq("organization_id", ctx.organizationId)
      .select("*")
      .maybeSingle();

    if (error) {
      return apiError(
        { code: "MILESTONE_UPDATE_ERROR", message: error.message },
        500
      );
    }
    if (!data) {
      return apiError(
        { code: "NOT_FOUND", message: "Milestone not found" },
        404
      );
    }

    return apiSuccess({ milestone: data as CustomerMilestone });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update milestone",
      },
      500
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("customer_milestones")
      .delete()
      .eq("id", params.milestoneId)
      .eq("customer_id", params.id)
      .eq("organization_id", ctx.organizationId)
      .select("id")
      .maybeSingle();

    if (error) {
      return apiError(
        { code: "MILESTONE_DELETE_ERROR", message: error.message },
        500
      );
    }
    if (!data) {
      return apiError(
        { code: "NOT_FOUND", message: "Milestone not found" },
        404
      );
    }

    return apiSuccess({ deleted: true, id: data.id });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete milestone",
      },
      500
    );
  }
}
