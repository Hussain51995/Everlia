"use client";

import type { Customer } from "@/lib/types/cards";
import { NewCustomerForm } from "./NewCustomerForm";
import type { NewCustomerFormState } from "./types";

type FrontStepProps = {
  disabled: boolean;
  customers: Customer[];
  customerId: string;
  onCustomerIdChange: (id: string) => void;
  showNewCustomer: boolean;
  onToggleNewCustomer: () => void;
  newCustomer: NewCustomerFormState;
  onNewCustomerChange: (value: NewCustomerFormState) => void;
  onCreateCustomer: () => void;
  isCreatingCustomer: boolean;
  occasionHeading: string;
  onOccasionHeadingChange: (value: string) => void;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  personalMessage: string;
  onPersonalMessageChange: (value: string) => void;
  onNext: () => void;
};

export function FrontStep({
  disabled,
  customers,
  customerId,
  onCustomerIdChange,
  showNewCustomer,
  onToggleNewCustomer,
  newCustomer,
  onNewCustomerChange,
  onCreateCustomer,
  isCreatingCustomer,
  occasionHeading,
  onOccasionHeadingChange,
  customerName,
  onCustomerNameChange,
  personalMessage,
  onPersonalMessageChange,
  onNext,
}: FrontStepProps) {
  return (
    <fieldset
      disabled={disabled}
      className="m-0 min-w-0 space-y-5 border-0 p-0"
    >
      <div className="space-y-2">
        <label
          htmlFor="recipient"
          className="text-xs font-bold text-[#0B1F3D]"
        >
          Recipient
        </label>
        <select
          id="recipient"
          value={customerId}
          onChange={(e) => onCustomerIdChange(e.target.value)}
          className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1] focus:bg-white"
        >
          <option value="">Select a customer…</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.first_name} {customer.last_name} — {customer.city},{" "}
              {customer.province_or_state}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onToggleNewCustomer}
          className="text-xs font-bold text-[#38B2D1] hover:underline"
        >
          {showNewCustomer
            ? "Hide new customer form"
            : "+ Add new customer"}
        </button>
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          showNewCustomer
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <NewCustomerForm
            value={newCustomer}
            onChange={onNewCustomerChange}
            onSave={onCreateCustomer}
            isSaving={isCreatingCustomer}
            disabled={!showNewCustomer}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-[#C4EBF2] bg-[#F8FCFD] p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
          Card front
        </p>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-[#0B1F3D]">
            Occasion heading{" "}
            <span className="font-normal text-[#557393]">(optional)</span>
          </span>
          <input
            value={occasionHeading}
            onChange={(e) => onOccasionHeadingChange(e.target.value)}
            className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
            placeholder="Happy Birthday!"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-[#0B1F3D]">
            Customer first name on card
          </span>
          <input
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
            placeholder="Sharjeel"
            required
          />
          <span className="text-[10px] text-[#557393]">
            Prints as “Dear {customerName.trim() || "Sharjeel"}”.
          </span>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-[#0B1F3D]">
            Personal message
          </span>
          <textarea
            value={personalMessage}
            onChange={(e) => onPersonalMessageChange(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
            placeholder="Happy birthday! Thinking of you…"
            required
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full rounded-2xl bg-[#38B2D1] py-3 text-sm font-bold text-white shadow-md shadow-[#38B2D1]/25 transition hover:bg-[#2ca0be]"
      >
        Next: Customize back
      </button>
    </fieldset>
  );
}
