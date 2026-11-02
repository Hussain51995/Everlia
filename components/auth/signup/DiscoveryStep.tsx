"use client";

import { useState } from "react";
import { ArrowIcon } from "@/components/ui/Icons";
import type {
  DiscoverableOrganizationSummary,
  DiscoveryResult,
} from "@/lib/types/onboarding";
import type { SignupIntent } from "@/stores/auth-store";
import { OrganizationCard } from "@/components/auth/signup/OrganizationCard";
import {
  FormError,
  InfoBanner,
  fieldLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textInputNoIconClass,
} from "@/components/auth/signup/shared";

type DiscoveryStepProps = {
  discovery: DiscoveryResult;
  selectedOrg: DiscoverableOrganizationSummary | null;
  invitationToken: string;
  intent: SignupIntent | null;
  error: string | null;
  onSelectOrg: (org: DiscoverableOrganizationSummary) => void;
  onInvitationTokenChange: (token: string) => void;
  onChooseIntent: (intent: SignupIntent) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function DiscoveryStep({
  discovery,
  selectedOrg,
  invitationToken,
  intent,
  error,
  onSelectOrg,
  onInvitationTokenChange,
  onChooseIntent,
  onContinue,
  onBack,
}: DiscoveryStepProps) {
  const [showInviteField, setShowInviteField] = useState(
    intent === "invitation" || discovery.state === "multiple_matches"
  );

  return (
    <div className="space-y-4">
      <FormError message={error} />

      {discovery.state === "single_match" ? (
        <SingleMatchView
          discovery={discovery}
          onContinue={() => {
            onChooseIntent("join");
            onContinue();
          }}
          onBack={onBack}
        />
      ) : null}

      {discovery.state === "multiple_matches" ? (
        <MultipleMatchView
          discovery={discovery}
          selectedOrg={selectedOrg}
          invitationToken={invitationToken}
          showInviteField={showInviteField}
          onSelectOrg={onSelectOrg}
          onInvitationTokenChange={onInvitationTokenChange}
          onToggleInvite={() => setShowInviteField((v) => !v)}
          onContinue={() => {
            onChooseIntent(invitationToken.trim() ? "invitation" : "join");
            onContinue();
          }}
          onBack={onBack}
        />
      ) : null}

      {discovery.state === "no_match" ? (
        <NoMatchView
          intent={intent}
          onChooseIntent={onChooseIntent}
          onContinue={onContinue}
          onBack={onBack}
          onShowInvite={() => {
            setShowInviteField(true);
            onChooseIntent("invitation");
          }}
          showInviteField={showInviteField}
          invitationToken={invitationToken}
          onInvitationTokenChange={onInvitationTokenChange}
        />
      ) : null}

      {discovery.state === "personal_email" ? (
        <PersonalEmailView
          intent={intent}
          invitationToken={invitationToken}
          showInviteField={showInviteField}
          onChooseIntent={onChooseIntent}
          onShowInvite={() => {
            setShowInviteField(true);
            onChooseIntent("invitation");
          }}
          onInvitationTokenChange={onInvitationTokenChange}
          onContinue={onContinue}
          onBack={onBack}
        />
      ) : null}

      {discovery.state === "invalid_email" ? (
        <div className="space-y-4">
          <InfoBanner tone="warning">{discovery.message}</InfoBanner>
          <button type="button" onClick={onBack} className={secondaryButtonClass}>
            Back
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SingleMatchView({
  discovery,
  onContinue,
  onBack,
}: {
  discovery: Extract<DiscoveryResult, { state: "single_match" }>;
  onContinue: () => void;
  onBack: () => void;
}) {
  const org = discovery.organizations[0];
  return (
    <div className="space-y-4">
      <InfoBanner tone="success">
        We found an organization for{" "}
        <span className="font-bold">{discovery.domain}</span>.
      </InfoBanner>
      <OrganizationCard organization={org} selected />
      <p className="text-[11px] text-[#557393]">
        Membership activates only after you verify your email (and meet this
        organization&apos;s join policy). Admin rights are never granted by
        domain match alone.
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onBack} className={secondaryButtonClass}>
          Back
        </button>
        <button type="button" onClick={onContinue} className={primaryButtonClass}>
          Continue to account
          <ArrowIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function MultipleMatchView({
  discovery,
  selectedOrg,
  invitationToken,
  showInviteField,
  onSelectOrg,
  onInvitationTokenChange,
  onToggleInvite,
  onContinue,
  onBack,
}: {
  discovery: Extract<DiscoveryResult, { state: "multiple_matches" }>;
  selectedOrg: DiscoverableOrganizationSummary | null;
  invitationToken: string;
  showInviteField: boolean;
  onSelectOrg: (org: DiscoverableOrganizationSummary) => void;
  onInvitationTokenChange: (token: string) => void;
  onToggleInvite: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <InfoBanner tone="warning">
        Multiple organizations share{" "}
        <span className="font-bold">{discovery.domain}</span>. Select yours, or
        use an invitation to disambiguate.
      </InfoBanner>

      <div
        role="radiogroup"
        aria-label="Select organization"
        className="max-h-56 space-y-2 overflow-y-auto pr-1"
      >
        {discovery.organizations.map((org) => (
          <OrganizationCard
            key={org.id}
            organization={org}
            selectable
            selected={selectedOrg?.id === org.id}
            onSelect={() => onSelectOrg(org)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onToggleInvite}
        className="text-[11px] font-bold text-[#38B2D1] hover:underline"
      >
        {showInviteField ? "Hide invitation field" : "I have an invitation"}
      </button>

      {showInviteField ? (
        <div>
          <label htmlFor="signup-invite-multi" className={fieldLabelClass}>
            Invitation token
          </label>
          <input
            id="signup-invite-multi"
            value={invitationToken}
            onChange={(e) => onInvitationTokenChange(e.target.value)}
            placeholder="Paste your invitation token"
            className={textInputNoIconClass}
            autoComplete="off"
          />
        </div>
      ) : null}

      <div className="flex gap-2">
        <button type="button" onClick={onBack} className={secondaryButtonClass}>
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedOrg && !invitationToken.trim()}
          className={primaryButtonClass}
        >
          Continue to account
          <ArrowIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PathChoiceButton({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-2xl border px-3.5 py-3 text-left transition-all",
        selected
          ? "border-[#38B2D1] bg-[#F0FAFC] ring-4 ring-[#38B2D1]/15"
          : "border-[#C4EBF2] bg-white hover:bg-[#F0FAFC]",
      ].join(" ")}
    >
      <span className="block text-sm font-bold text-[#0B1F3D]">{title}</span>
      <span className="mt-0.5 block text-[11px] text-[#557393]">
        {description}
      </span>
    </button>
  );
}

function NoMatchView({
  intent,
  onChooseIntent,
  onContinue,
  onBack,
  onShowInvite,
  showInviteField,
  invitationToken,
  onInvitationTokenChange,
}: {
  intent: SignupIntent | null;
  onChooseIntent: (intent: SignupIntent) => void;
  onContinue: () => void;
  onBack: () => void;
  onShowInvite: () => void;
  showInviteField: boolean;
  invitationToken: string;
  onInvitationTokenChange: (token: string) => void;
}) {
  return (
    <div className="space-y-4">
      <InfoBanner tone="warning">
        We couldn&apos;t find an organization associated with your email.
      </InfoBanner>

      <div className="space-y-2">
        <PathChoiceButton
          title="Create or request an organization"
          description="Submit your company or team for review. You’ll get a private draft workspace."
          selected={intent === "request_organization"}
          onClick={() => onChooseIntent("request_organization")}
        />
        <PathChoiceButton
          title="I'm an independent professional"
          description="Get your own private Everlia workspace — never shared with others."
          selected={intent === "independent"}
          onClick={() => onChooseIntent("independent")}
        />
      </div>

      <button
        type="button"
        onClick={onShowInvite}
        className="text-[11px] font-bold text-[#38B2D1] hover:underline"
      >
        I have an organization invitation
      </button>

      {showInviteField ? (
        <div>
          <label htmlFor="signup-invite-none" className={fieldLabelClass}>
            Invitation token
          </label>
          <input
            id="signup-invite-none"
            value={invitationToken}
            onChange={(e) => {
              onInvitationTokenChange(e.target.value);
              onChooseIntent("invitation");
            }}
            placeholder="Paste your invitation token"
            className={textInputNoIconClass}
            autoComplete="off"
          />
        </div>
      ) : null}

      <div className="flex gap-2">
        <button type="button" onClick={onBack} className={secondaryButtonClass}>
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={
            !intent ||
            (intent === "invitation" && !invitationToken.trim())
          }
          className={primaryButtonClass}
        >
          Continue to account
          <ArrowIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PersonalEmailView({
  intent,
  invitationToken,
  showInviteField,
  onChooseIntent,
  onShowInvite,
  onInvitationTokenChange,
  onContinue,
  onBack,
}: {
  intent: SignupIntent | null;
  invitationToken: string;
  showInviteField: boolean;
  onChooseIntent: (intent: SignupIntent) => void;
  onShowInvite: () => void;
  onInvitationTokenChange: (token: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <InfoBanner tone="warning">
        Organization matching requires a company email domain. Personal providers
        like Gmail, Yahoo, Outlook, Hotmail, and iCloud can&apos;t be auto-matched.
      </InfoBanner>

      <div className="space-y-2">
        <PathChoiceButton
          title="Continue as an independent professional"
          description="Create a private workspace for your own practice."
          selected={intent === "independent"}
          onClick={() => onChooseIntent("independent")}
        />
        <PathChoiceButton
          title="I have an organization invitation"
          description="Join a company or team with a secure invitation token."
          selected={intent === "invitation"}
          onClick={onShowInvite}
        />
      </div>

      {showInviteField || intent === "invitation" ? (
        <div>
          <label htmlFor="signup-invite-personal" className={fieldLabelClass}>
            Invitation token
          </label>
          <input
            id="signup-invite-personal"
            value={invitationToken}
            onChange={(e) => {
              onInvitationTokenChange(e.target.value);
              onChooseIntent("invitation");
            }}
            placeholder="Paste your invitation token"
            className={textInputNoIconClass}
            autoComplete="off"
          />
        </div>
      ) : null}

      <div className="flex gap-2">
        <button type="button" onClick={onBack} className={secondaryButtonClass}>
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={
            !intent ||
            (intent === "invitation" && !invitationToken.trim())
          }
          className={primaryButtonClass}
        >
          Continue to account
          <ArrowIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
