type EmailShellProps = {
  preview: string;
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote?: string;
};

export function renderBrandedEmail({
  preview,
  title,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footerNote,
}: EmailShellProps) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F0FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0B1F3D;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F0FAFC;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #C4EBF2;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(56,178,209,0.12);">
            <tr>
              <td style="height:6px;background:#38B2D1;"></td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#38B2D1;">HomeLink</p>
                <h1 style="margin:10px 0 0 0;font-size:24px;line-height:1.25;font-weight:800;color:#0B1F3D;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 24px 28px;font-size:14px;line-height:1.6;color:#557393;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 28px 28px 28px;">
                <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#38B2D1;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 22px;border-radius:16px;box-shadow:0 8px 20px rgba(56,178,209,0.35);">
                  ${escapeHtml(ctaLabel)}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px 28px;font-size:12px;line-height:1.5;color:#557393;border-top:1px solid #F0FAFC;">
                <p style="margin:16px 0 0 0;">If the button does not work, copy and paste this link:</p>
                <p style="margin:8px 0 0 0;word-break:break-all;color:#38B2D1;">${escapeHtml(ctaUrl)}</p>
                ${footerNote ? `<p style="margin:16px 0 0 0;">${escapeHtml(footerNote)}</p>` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function verificationEmailHtml(params: {
  firstName?: string | null;
  verifyUrl: string;
}) {
  const name = params.firstName?.trim() || "there";
  return renderBrandedEmail({
    preview: "Confirm your HomeLink email to continue",
    title: "Confirm your email",
    bodyHtml: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(name)},</p>
<p style="margin:0;">Thanks for creating a HomeLink account. Confirm your email address to sign in and start managing client retention campaigns.</p>`,
    ctaLabel: "Verify email",
    ctaUrl: params.verifyUrl,
    footerNote: "If you did not create this account, you can ignore this email.",
  });
}

export function passwordResetEmailHtml(params: {
  resetUrl: string;
}) {
  return renderBrandedEmail({
    preview: "Reset your HomeLink password",
    title: "Reset your password",
    bodyHtml: `<p style="margin:0 0 12px 0;">We received a request to reset your HomeLink password.</p>
<p style="margin:0;">Click the button below to choose a new password. This link expires soon for your security.</p>`,
    ctaLabel: "Reset password",
    ctaUrl: params.resetUrl,
    footerNote: "If you did not request a password reset, you can ignore this email.",
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
