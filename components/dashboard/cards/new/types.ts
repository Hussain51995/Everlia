import type { CustomerCreateInput } from "@/lib/validations/cards";

export type CardSide = "front" | "back";

export type NewCustomerFormState = CustomerCreateInput;

export const EMPTY_NEW_CUSTOMER: NewCustomerFormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  province_or_state: "",
  postal_or_zip: "",
  country_code: "US",
  property_address: "",
};

export const NEW_CUSTOMER_FIELDS = [
  ["first_name", "First name"],
  ["last_name", "Last name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["address_line1", "Address line 1"],
  ["address_line2", "Address line 2"],
  ["city", "City"],
  ["province_or_state", "State / Province"],
  ["postal_or_zip", "Postal / ZIP"],
  ["country_code", "Country code"],
  ["property_address", "Property address"],
] as const satisfies ReadonlyArray<
  readonly [keyof NewCustomerFormState, string]
>;
