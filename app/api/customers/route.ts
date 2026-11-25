import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { customerCreateSchema } from "@/lib/validations/cards";
import { firstZodError } from "@/lib/validations/errors";
import type { Customer } from "@/lib/types/cards";

export async function GET() {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      return apiError(
        { code: "CUSTOMERS_ERROR", message: error.message },
        500
      );
    }

    return apiSuccess({ customers: (data ?? []) as Customer[] });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load customers",
      },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const body = await request.json();
    const parsed = customerCreateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid customer data")
      );
    }

    const input = parsed.data;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .insert({
        organization_id: ctx.organizationId,
        created_by: ctx.user.id,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email || null,
        phone: input.phone || null,
        address_line1: input.address_line1,
        address_line2: input.address_line2 || null,
        city: input.city,
        province_or_state: input.province_or_state,
        postal_or_zip: input.postal_or_zip,
        country_code: (input.country_code || "US").toUpperCase(),
        property_address: input.property_address,
      })
      .select("*")
      .single();

    if (error) {
      return apiError(
        { code: "CUSTOMER_CREATE_ERROR", message: error.message },
        500
      );
    }

    return apiSuccess({ customer: data as Customer });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to create customer",
      },
      500
    );
  }
}
