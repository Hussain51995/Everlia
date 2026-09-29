import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export function getEmailFromAddress() {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    throw new Error(
      'Missing EMAIL_FROM (e.g. "HomeLink <onboarding@yourdomain.com>")'
    );
  }
  return from;
}
