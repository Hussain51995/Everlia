export {
  normalizeEmailAddress,
  extractEmailDomain,
  normalizeEmailAndDomain,
} from "@/lib/onboarding/normalize-email";
export {
  getPersonalEmailDomains,
  isPersonalEmailDomain,
  DEFAULT_PERSONAL_EMAIL_DOMAINS,
} from "@/lib/onboarding/personal-email-domains";
export {
  checkRateLimit,
  getClientIp,
  hashRateLimitIdentity,
  resetRateLimitBuckets,
} from "@/lib/onboarding/rate-limit";
export {
  discoverOrganizations,
  assertDiscoverableOrganization,
} from "@/lib/onboarding/discover";
export { requestOrganizationMembership } from "@/lib/onboarding/membership";
export { resolveJoinMembershipIntent } from "@/lib/onboarding/join-policy";
export { submitOrganizationRequest } from "@/lib/onboarding/organization-request";
export { provisionIndependentWorkspace } from "@/lib/onboarding/independent";
export {
  createOrganizationInvitation,
  findValidInvitationByToken,
  assertInvitationForUser,
  markInvitationRedeemed,
} from "@/lib/onboarding/invitations";
export {
  addOrganizationDomain,
  verifyOrganizationDomain,
} from "@/lib/onboarding/domain-verification";
export {
  ensureDomainVerificationChallenge,
  verifyDomainOwnershipViaDns,
  verifyDomainDnsChallenge,
  hashDomainChallengeToken,
} from "@/lib/onboarding/domain-challenge";
export {
  approvePendingMembership,
  rejectPendingMembership,
  listPendingMemberships,
} from "@/lib/onboarding/membership-moderation";
export {
  createCompanyOrganizationDraft,
  findDuplicateOrganizationsByDomain,
  activateOrganizationAfterDomainVerification,
  setOrganizationActiveState,
  approveOrganizationRequestById,
  rejectOrganizationRequestById,
  listOrganizationRequests,
} from "@/lib/onboarding/organization-lifecycle";
export { findAuthUserIdByEmail } from "@/lib/onboarding/account";
export { activatePendingMembershipsForVerifiedUser } from "@/lib/onboarding/activate-memberships";
export {
  registerIndependentAccount,
  registerOrganizationRequestAccount,
} from "@/lib/onboarding/register-account";
