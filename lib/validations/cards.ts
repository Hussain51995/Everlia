import { z } from "zod";

export const customerCreateSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  address_line1: z.string().trim().min(1, "Address is required").max(200),
  address_line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1, "City is required").max(100),
  province_or_state: z
    .string()
    .trim()
    .min(1, "State / province is required")
    .max(100),
  postal_or_zip: z.string().trim().min(1, "Postal / ZIP is required").max(20),
  country_code: z
    .string()
    .trim()
    .length(2, "Country code must be 2 letters")
    .default("US"),
  property_address: z
    .string()
    .trim()
    .min(1, "Property address is required")
    .max(300),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const greetingCardCreateSchema = z.object({
  template_id: z.string().uuid("Invalid template"),
  customer_id: z.string().uuid("Invalid customer"),
  field_values: z
    .record(z.string(), z.string().optional())
    .optional()
    .default({}),
});

export const greetingCardUpdateSchema = z.object({
  customer_id: z.string().uuid("Invalid customer").optional(),
  field_values: z.record(z.string(), z.string().optional()).optional(),
});

export const cardResponseSubmitSchema = z.object({
  response_type: z.enum(["thank", "message", "contact_request"]),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const mailProviderConfigUpdateSchema = z.object({
  provider_slug: z.enum(["postgrid", "lob", "click2mail"]),
  environment: z.enum(["test", "live"]),
  settings: z.record(z.string(), z.unknown()).optional().default({}),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type GreetingCardCreateInput = z.infer<typeof greetingCardCreateSchema>;
export type GreetingCardUpdateInput = z.infer<typeof greetingCardUpdateSchema>;
export type CardResponseSubmitInput = z.infer<typeof cardResponseSubmitSchema>;
export type MailProviderConfigUpdateInput = z.infer<
  typeof mailProviderConfigUpdateSchema
>;
