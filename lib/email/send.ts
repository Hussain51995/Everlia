import { getEmailFromAddress, getResendClient } from "@/lib/email/client";
import {
  passwordResetEmailHtml,
  verificationEmailHtml,
} from "@/lib/email/templates";

type SendResult = {
  id: string;
};

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: getEmailFromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    throw new Error("Resend did not return an email id");
  }

  return { id: data.id };
}

export async function sendVerificationEmail(input: {
  to: string;
  verifyUrl: string;
  firstName?: string | null;
}) {
  return sendEmail({
    to: input.to,
    subject: "Confirm your Everlia email",
    html: verificationEmailHtml({
      firstName: input.firstName,
      verifyUrl: input.verifyUrl,
    }),
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
}) {
  return sendEmail({
    to: input.to,
    subject: "Reset your Everlia password",
    html: passwordResetEmailHtml({
      resetUrl: input.resetUrl,
    }),
  });
}
