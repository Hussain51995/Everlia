"use client";

type BackStepProps = {
  disabled: boolean;
  senderName: string;
  onSenderNameChange: (value: string) => void;
  senderTitle: string;
  onSenderTitleChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  emailAddress: string;
  onEmailAddressChange: (value: string) => void;
  website: string;
  onWebsiteChange: (value: string) => void;
  onBack: () => void;
  isSaving: boolean;
};

export function BackStep({
  disabled,
  senderName,
  onSenderNameChange,
  senderTitle,
  onSenderTitleChange,
  phone,
  onPhoneChange,
  emailAddress,
  onEmailAddressChange,
  website,
  onWebsiteChange,
  onBack,
  isSaving,
}: BackStepProps) {
  return (
    <fieldset
      disabled={disabled}
      className="m-0 min-w-0 space-y-5 border-0 p-0"
    >
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#38B2D1]">
          Sender details
        </div>
        <h2 className="mt-1 text-xl font-extrabold text-[#0B1F3D]">
          Card back
        </h2>
        <p className="mt-1 text-sm text-[#557393]">
          Add the contact information that should appear on the back of the
          card.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-[#C4EBF2] bg-[#F8FCFD] p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
          Agent info
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-[#0B1F3D]">Your name</span>
            <input
              value={senderName}
              onChange={(e) => onSenderNameChange(e.target.value)}
              className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-[#0B1F3D]">
              Title / designation
            </span>
            <input
              value={senderTitle}
              onChange={(e) => onSenderTitleChange(e.target.value)}
              className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
              placeholder="REALTOR®"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-[#0B1F3D]">Phone</span>
            <input
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
              placeholder="(555) 123-4567"
              type="tel"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-[#0B1F3D]">Email</span>
            <input
              value={emailAddress}
              onChange={(e) => onEmailAddressChange(e.target.value)}
              className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
              placeholder="you@everliarealty.com"
              type="email"
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-xs font-bold text-[#0B1F3D]">Website</span>
            <input
              value={website}
              onChange={(e) => onWebsiteChange(e.target.value)}
              className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
              placeholder="https://www.everliarealty.com"
              type="url"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-2xl border border-[#C4EBF2] bg-white py-3 text-sm font-bold text-[#0B1F3D] transition hover:bg-[#F0FAFC]"
        >
          Back to front
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-2xl bg-[#38B2D1] py-3 text-sm font-bold text-white shadow-md shadow-[#38B2D1]/25 transition hover:bg-[#2ca0be] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving draft…" : "Save draft & continue"}
        </button>
      </div>
    </fieldset>
  );
}
