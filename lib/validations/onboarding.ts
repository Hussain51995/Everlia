import { z } from "zod";
import { emailSchema, uuidSchema } from "@/lib/validations/auth";

export const discoverOrganizationsSchema = z.object({
  industryId: uuidSchema,
  email: emailSchema,
});

export const requestOrganizationSchema = z.object({
  industryId: uuidSchema,
  name: z.string().trim().min(2, "Organization name is required").max(120),
  domain: z
    .string()
    .trim()
    .max(253)
    .optional()
    .or(z.literal("")),
  workspaceType: z.enum(["company", "team"]).default("company"),
});

export const provisionIndependentSchema = z.object({
  industryId: uuidSchema,
  displayName: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .optional()
    .or(z.literal("")),
});

export const requestMembershipSchema = z.object({
  organizationId: uuidSchema,
  invitationToken: z.string().trim().min(16).max(200).optional(),
});

export const acceptInvitationSchema = z.object({
  invitationToken: z.string().trim().min(16, "Invitation token is required").max(200),
});

export const createOrganizationInvitationSchema = z.object({
  organizationId: uuidSchema,
  email: emailSchema.optional(),
  expiresInHours: z.number().int().min(1).max(720).optional(),
});

export type DiscoverOrganizationsInput = z.infer<
  typeof discoverOrganizationsSchema
>;
export type RequestOrganizationInput = z.infer<typeof requestOrganizationSchema>;
export type ProvisionIndependentInput = z.infer<
  typeof provisionIndependentSchema
>;
export type RequestMembershipInput = z.infer<typeof requestMembershipSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type CreateOrganizationInvitationInput = z.infer<
  typeof createOrganizationInvitationSchema
>;
