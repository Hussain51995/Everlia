export function isEmailVerificationEnabled() {
  const value = process.env.EMAIL_VERIFICATION?.trim().toLowerCase();
  if (value === "false" || value === "0" || value === "off") {
    return false;
  }
  return true;
}
