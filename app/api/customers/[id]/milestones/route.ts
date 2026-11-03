import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { customerMilestoneCreateSchema } from "@/lib/validations/campaigns";
import { firstZodError } from "@/lib/validations/errors";
import type { CustomerMilestone } from "@/lib/types/cards";

type Params = { params: { id: string } };

async function assertCustomerInOrg(
  customerId: string,
  organizationId: string
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    return { error: apiError({ code: "CUSTOMER_ERROR", message: error.message }, 500) };
  }
  if (!data) {
    return {
      error: apiError({ code: "NOT_FOUND", message: "Customer not found" }, 404),
    };
  }
  return { supabase };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const gate = await assertCustomerInOrg(params.id, ctx.organizationId);
    if ("error" in gate && gate.error) return gate.error;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("customer_milestones")
      .select("*")
      .eq("customer_id", params.id)
      .eq("organization_id", ctx.organizationId)
      .order("anchor_date", { ascending: true });

    if (error) {
      return apiError(
        { code: "MILESTONE_ERROR", message: error.message },
        500
      );
    }

    return apiSuccess({
      milestones: (data ?? []) as CustomerMilestone[],
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load milestones",
      },
      500
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const gate = await assertCustomerInOrg(params.id, ctx.organizationId);
    if ("error" in gate && gate.error) return gate.error;

    const body = await request.json().catch(() => null);
    const parsed = customerMilestoneCreateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid milestone data")
      );
    }

    const input = parsed.data;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customer_milestones")
      .insert({
        organization_id: ctx.organizationId,
        customer_id: params.id,
        milestone_type: input.milestone_type,
        anchor_date: input.anchor_date,
        label: input.label?.trim() || null,
        property_type: input.property_type?.trim() || null,
        recurs_annually: input.recurs_annually ?? true,
        metadata: input.metadata ?? {},
        is_active: input.is_active ?? true,
      })
      .select("*")
      .single();

    if (error) {
      return apiError(
        { code: "MILESTONE_CREATE_ERROR", message: error.message },
        500
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
            : "Failed to create milestone",
      },
      500
    );
  }
}
