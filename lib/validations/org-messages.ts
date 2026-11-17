import { z } from "zod";
import {
  CARD_FOOTER_MAX,
  CARD_GREETING_MAX,
  CARD_MESSAGE_MAX,
} from "@/lib/campaigns/messages";
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
    greetingTemplate: z.string().trim().min(1).max(CARD_GREETING_MAX),
    messageTemplate: z.string().trim().min(1).max(CARD_MESSAGE_MAX),
    footerTemplate: z
      .union([z.string().trim().max(CARD_FOOTER_MAX), z.null()])
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
