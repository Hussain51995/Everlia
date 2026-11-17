import { z } from "zod";
import { validateMessageTemplate } from "@/lib/campaigns/placeholders";

function assertPlaceholders(template: string, field: string) {
  const result = validateMessageTemplate(template);
  if (!result.ok) {
    throw new Error(
      `${field} has unknown placeholders: ${result.unknowns.join(", ")}`
    );
  }
}

export const orgOccasionMessageUpsertSchema = z
  .object({
    occasionSlug: z.string().trim().min(1).max(80),
    greetingTemplate: z.string().trim().min(1).max(200),
    messageTemplate: z.string().trim().min(1).max(800),
    footerTemplate: z
      .union([z.string().trim().max(200), z.null()])
      .optional(),
  })
  .superRefine((value, ctx) => {
    try {
      assertPlaceholders(value.greetingTemplate, "greetingTemplate");
      assertPlaceholders(value.messageTemplate, "messageTemplate");
      if (value.footerTemplate) {
        assertPlaceholders(value.footerTemplate, "footerTemplate");
      }
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          error instanceof Error ? error.message : "Invalid placeholders",
      });
    }
  });

export type OrgOccasionMessageUpsertInput = z.infer<
  typeof orgOccasionMessageUpsertSchema
>;
