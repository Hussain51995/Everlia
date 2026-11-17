import { z } from "zod";
import { validateMessageTemplate } from "@/lib/campaigns/placeholders";

const messageOverrideObjectSchema = z.object({
  greetingTemplate: z.string().trim().min(1).max(200).optional(),
  messageTemplate: z.string().trim().min(1).max(600).optional(),
  footerTemplate: z.string().trim().max(160).nullable().optional(),
});

function assertPlaceholders(template: string, label: string) {
  const result = validateMessageTemplate(template);
  if (!result.ok) {
    throw new Error(
      `${label} contains unknown placeholders: ${result.unknowns.join(", ")}`
    );
  }
}

export const campaignPreviewSchema = z
  .object({
    templateId: z.string().uuid("Invalid template"),
    customerId: z.string().uuid("Invalid customer").optional(),
    customer: z
      .object({
        first_name: z.string().trim().max(100).optional().default(""),
        last_name: z.string().trim().max(100).optional().default(""),
      })
      .optional(),
    occasionSlug: z.string().trim().max(80).optional(),
    occasionId: z.string().uuid().optional(),
    occasionName: z.string().trim().max(120).optional(),
    messageTemplateOverride: z
      .union([z.string().trim().max(800), messageOverrideObjectSchema])
      .optional(),
    milestone: z
      .object({
        anchor_date: z.string().trim().max(32).optional(),
        label: z.string().trim().max(120).optional(),
        type: z.string().trim().max(60).optional(),
        years: z.number().int().min(0).max(200).optional(),
      })
      .optional(),
    campaignName: z.string().trim().max(160).optional(),
    includePdf: z.boolean().optional().default(false),
    includeCompanyLogo: z.boolean().optional().default(false),
  })
  .superRefine((value, ctx) => {
    if (!value.customerId && !value.customer) {
      ctx.addIssue({
        code: "custom",
        message: "Provide customerId or customer",
        path: ["customerId"],
      });
    }

    const override = value.messageTemplateOverride;
    if (!override) return;

    try {
      if (typeof override === "string") {
        if (override.startsWith("{")) {
          const parsed = JSON.parse(override) as {
            greetingTemplate?: string;
            messageTemplate?: string;
            footerTemplate?: string | null;
          };
          if (parsed.greetingTemplate) {
            assertPlaceholders(parsed.greetingTemplate, "greetingTemplate");
          }
          if (parsed.messageTemplate) {
            assertPlaceholders(parsed.messageTemplate, "messageTemplate");
          }
          if (parsed.footerTemplate) {
            assertPlaceholders(parsed.footerTemplate, "footerTemplate");
          }
        } else {
          assertPlaceholders(override, "messageTemplateOverride");
        }
      } else {
        if (override.greetingTemplate) {
          assertPlaceholders(override.greetingTemplate, "greetingTemplate");
        }
        if (override.messageTemplate) {
          assertPlaceholders(override.messageTemplate, "messageTemplate");
        }
        if (override.footerTemplate) {
          assertPlaceholders(override.footerTemplate, "footerTemplate");
        }
      }
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message:
          error instanceof Error
            ? error.message
            : "Invalid message template override",
        path: ["messageTemplateOverride"],
      });
    }
  });

export type CampaignPreviewInput = z.infer<typeof campaignPreviewSchema>;

const civilDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const customerMilestoneTypeSchema = z.enum([
  "birthday",
  "home_anniversary",
  "closing_anniversary",
  "custom",
]);

const customerMilestoneFields = {
  milestone_type: customerMilestoneTypeSchema,
  anchor_date: civilDateSchema,
  label: z.string().trim().max(120).optional().or(z.literal("")),
  property_type: z.string().trim().max(80).optional().or(z.literal("")),
  recurs_annually: z.boolean().optional().default(true),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  is_active: z.boolean().optional().default(true),
};

export const customerMilestoneCreateSchema = z
  .object(customerMilestoneFields)
  .superRefine((value, ctx) => {
    if (value.milestone_type === "custom" && !value.label?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Custom milestones require a label",
        path: ["label"],
      });
    }
  });

export const customerMilestoneUpdateSchema = z
  .object(customerMilestoneFields)
  .partial()
  .superRefine((value, ctx) => {
    if (
      value.milestone_type === "custom" &&
      value.label !== undefined &&
      !value.label?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Custom milestones require a label",
        path: ["label"],
      });
    }
  });

export const campaignSchedulePreviewSchema = z
  .object({
    startDate: civilDateSchema,
    endDate: civilDateSchema,
    timezone: z.string().trim().min(1).max(80).default("America/New_York"),
    customerIds: z.array(z.string().uuid()).min(1).max(500),
    occasionSlugs: z
      .array(z.string().trim().min(1).max(80))
      .max(100)
      .optional()
      .default([]),
    customOccasions: z
      .array(
        z.object({
          key: z.string().trim().min(1).max(80),
          name: z.string().trim().min(1).max(120),
          occurrenceDate: civilDateSchema,
          leadDays: z.number().int().min(0).max(60).optional().default(7),
          excludedCustomerIds: z.array(z.string().uuid()).max(500).optional(),
        })
      )
      .max(50)
      .optional()
      .default([]),
    leadDaysByOccasionSlug: z
      .record(z.string(), z.number().int().min(0).max(60))
      .optional(),
    exclusionsByOccasionSlug: z
      .record(z.string(), z.array(z.string().uuid()))
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.startDate > value.endDate) {
      ctx.addIssue({
        code: "custom",
        message: "startDate must be on or before endDate",
        path: ["endDate"],
      });
    }
    if (
      (value.occasionSlugs?.length ?? 0) === 0 &&
      (value.customOccasions?.length ?? 0) === 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Provide at least one catalog occasion or custom date",
        path: ["occasionSlugs"],
      });
    }
  });

export type CustomerMilestoneCreateInput = z.input<
  typeof customerMilestoneCreateSchema
>;
export type CustomerMilestoneUpdateInput = z.input<
  typeof customerMilestoneUpdateSchema
>;
export type CampaignSchedulePreviewInput = z.input<
  typeof campaignSchedulePreviewSchema
>;

export const campaignMailingModeSchema = z.enum(["dry_run", "test", "live"]);

function rejectLiveUnlessEnabled(
  mailingMode: string | undefined,
  ctx: z.RefinementCtx
) {
  if (mailingMode !== "live") return;
  const enabled =
    process.env.CAMPAIGN_LIVE_MAIL_ENABLED === "true" &&
    process.env.POSTGRID_MODE === "live";
  if (!enabled) {
    ctx.addIssue({
      code: "custom",
      message:
        "Live mailing mode is disabled. Set CAMPAIGN_LIVE_MAIL_ENABLED=true and POSTGRID_MODE=live.",
      path: ["mailingMode"],
    });
  }
}

export const campaignOccasionConfigSchema = z
  .object({
    occasionId: z.string().uuid().optional(),
    occasionSlug: z.string().trim().min(1).max(80).optional(),
    customName: z.string().trim().min(1).max(120).optional(),
    occurrenceDate: civilDateSchema.optional(),
    leadDays: z.number().int().min(0).max(60).optional(),
    messageTemplate: z.string().trim().max(800).optional().nullable(),
    isEnabled: z.boolean().optional().default(true),
    excludedCustomerIds: z.array(z.string().uuid()).max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.occasionId && !value.occasionSlug && !value.customName && !value.occurrenceDate) {
      ctx.addIssue({
        code: "custom",
        message: "Each occasion needs a catalog id/slug or a custom name/date",
      });
    }
  });

export const campaignCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Campaign name is required").max(160),
    defaultTemplateId: z.string().uuid("Select a design"),
    startDate: civilDateSchema,
    endDate: civilDateSchema,
    timezone: z.string().trim().min(1).max(80).default("America/New_York"),
    mailingMode: campaignMailingModeSchema.optional().default("test"),
    customerIds: z.array(z.string().uuid()).min(1).max(500),
    occasions: z.array(campaignOccasionConfigSchema).min(1).max(100),
    configuration: z.record(z.string(), z.unknown()).optional().default({}),
    fieldValueDefaults: z.record(z.string(), z.unknown()).optional().default({}),
    activate: z.boolean().optional().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.startDate > value.endDate) {
      ctx.addIssue({
        code: "custom",
        message: "Start date must be on or before end date",
        path: ["endDate"],
      });
    }
    rejectLiveUnlessEnabled(value.mailingMode, ctx);
  });

export const campaignUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    defaultTemplateId: z.string().uuid().optional(),
    startDate: civilDateSchema.optional(),
    endDate: civilDateSchema.optional(),
    timezone: z.string().trim().min(1).max(80).optional(),
    mailingMode: campaignMailingModeSchema.optional(),
    customerIds: z.array(z.string().uuid()).min(1).max(500).optional(),
    occasions: z.array(campaignOccasionConfigSchema).min(1).max(100).optional(),
    configuration: z.record(z.string(), z.unknown()).optional(),
    fieldValueDefaults: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      ctx.addIssue({
        code: "custom",
        message: "Start date must be on or before end date",
        path: ["endDate"],
      });
    }
    rejectLiveUnlessEnabled(value.mailingMode, ctx);
  });

export const campaignExtendSchema = z.object({
  endDate: civilDateSchema,
});

export type CampaignCreateInput = z.input<typeof campaignCreateSchema>;
export type CampaignUpdateInput = z.input<typeof campaignUpdateSchema>;
export type CampaignExtendInput = z.input<typeof campaignExtendSchema>;
export type CampaignOccasionConfigInput = z.input<
  typeof campaignOccasionConfigSchema
>;
