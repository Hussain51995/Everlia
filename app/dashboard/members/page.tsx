"use client";

import { PendingMembersPanel } from "@/components/dashboard/PendingMembersPanel";

export default function MembersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B1F3D]">Members</h1>
        <p className="mt-1 text-sm text-[#557393]">
          Moderate join requests for your active organization.
        </p>
      </div>
      <PendingMembersPanel />
    </div>
  );
}
