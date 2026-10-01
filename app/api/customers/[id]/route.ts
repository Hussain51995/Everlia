import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { customerUpdateSchema } from "@/lib/validations/cards";
import { firstZodError } from "@/lib/validations/errors";
import type { Customer } from "@/lib/types/cards";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const body = await request.json();
    const parsed = customerUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid customer data")
      );
    }

    const input = parsed.data;
    const updates: Record<string, unknown> = {};

    if (input.first_name !== undefined) updates.first_name = input.first_name;
    if (input.last_name !== undefined) updates.last_name = input.last_name;
    if (input.email !== undefined) updates.email = input.email || null;
    if (input.phone !== undefined) updates.phone = input.phone || null;
    if (input.address_line1 !== undefined)
      updates.address_line1 = input.address_line1;
    if (input.address_line2 !== undefined)
      updates.address_line2 = input.address_line2 || null;
    if (input.city !== undefined) updates.city = input.city;
    if (input.province_or_state !== undefined)
      updates.province_or_state = input.province_or_state;
    if (input.postal_or_zip !== undefined)
      updates.postal_or_zip = input.postal_or_zip;
    if (input.country_code !== undefined)
      updates.country_code = input.country_code.toUpperCase();

    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .select("*")
      .maybeSingle();

    if (error) {
      return apiError(
        { code: "CUSTOMER_UPDATE_ERROR", message: error.message },
        500
      );
    }

    if (!data) {
      return apiError(
        { code: "NOT_FOUND", message: "Customer not found" },
        404
      );
    }

    return apiSuccess({ customer: data as Customer });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to update customer",
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
      .from("customers")
      .delete()
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .select("id")
      .maybeSingle();

    if (error) {
      return apiError(
        { code: "CUSTOMER_DELETE_ERROR", message: error.message },
        500
      );
    }

    if (!data) {
      return apiError(
        { code: "NOT_FOUND", message: "Customer not found" },
        404
      );
    }

    return apiSuccess({ deleted: true, id: data.id });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to delete customer",
      },
      500
    );
  }
}
