import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const uuidSchema = z.string().uuid("Invalid id");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  organizationId: uuidSchema,
});

export const joinOrganizationSchema = z
  .object({
    organizationId: uuidSchema,
    email: emailSchema.optional(),
    password: z.string().min(1).optional(),
    invitationToken: z.string().trim().min(16).max(200).optional(),
  })
  .superRefine((value, ctx) => {
    const hasEmail = Boolean(value.email);
    const hasPassword = Boolean(value.password);
    if (hasEmail !== hasPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Email and password are both required for signup join",
        path: hasEmail ? ["password"] : ["email"],
      });
    }
  });

export const activeOrganizationSchema = z.object({
  organizationId: uuidSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z.object({
  password: passwordSchema,
});

export const setupPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const organizationsQuerySchema = z.object({
  industry_id: uuidSchema,
});

export const createOrganizationSchema = z.object({
  industryId: uuidSchema,
  name: z.string().trim().min(2, "Organization name is required").max(120),
  slug: z.string().trim().min(1).max(60).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  domain: z.string().trim().min(3).max(253).optional().or(z.literal("")),
  workspaceType: z.enum(["company", "team"]).optional().default("company"),
  joinPolicy: z
    .enum(["verified_domain", "approval_required", "invite_only"])
    .optional()
    .default("verified_domain"),
  markDomainVerified: z.boolean().optional().default(true),
});

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: z.string().trim().min(1).max(60).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.slug !== undefined ||
      value.isActive !== undefined,
    { message: "Provide at least one field to update" }
  );

export const createIndustrySchema = z.object({
  name: z.string().trim().min(2, "Industry name is required").max(120),
  slug: z.string().trim().min(1).max(60).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export const updateIndustrySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: z.string().trim().min(1).max(60).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.slug !== undefined ||
      value.isActive !== undefined,
    { message: "Provide at least one field to update" }
  );

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type JoinOrganizationInput = z.infer<typeof joinOrganizationSchema>;
export type ActiveOrganizationInput = z.infer<typeof activeOrganizationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type SetupPasswordInput = z.infer<typeof setupPasswordSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type CreateIndustryInput = z.infer<typeof createIndustrySchema>;
export type UpdateIndustryInput = z.infer<typeof updateIndustrySchema>;
