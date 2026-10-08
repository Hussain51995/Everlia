export type GreetingCardStatus =
  | "draft"
  | "ready_to_send"
  | "submitted"
  | "processing"
  | "mailed"
  | "delivered"
  | "qr_scanned"
  | "response_received";

export type CardResponseType = "thank" | "message" | "contact_request";

export type CardTemplateCategory =
  | "birthday"
  | "anniversary"
  | "home_anniversary"
  | "holiday"
  | "thank_you"
  | "congratulations"
  | "welcome_home"
  | "customer_appreciation";

export type MailEnvironment = "test" | "live";

export type DesignFieldType = "text" | "image" | "qr";

export type DesignFieldAlign = "left" | "center" | "right";

export type DesignField = {
  key: string;
  type: DesignFieldType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  size?: number;
  fontSize?: number;
  color?: string;
  align?: DesignFieldAlign;
  fontWeight?: "normal" | "bold";
  maxLines?: number;
  label?: string;
  required?: boolean;
  side?: "front" | "back";
  shape?: "circle" | "rect";
  letterSpacing?: number;
  textTransform?: "uppercase" | "none";
  lineHeight?: number;
  fontFamily?: string;
  fontStyle?: "normal" | "italic";
};

export type DesignConfig = {
  width: number;
  height: number;
  dpi: number;
  orientation: "landscape" | "portrait";
  front: { fields: DesignField[] };
  back: { fields: DesignField[] };
};

export type CardTemplate = {
  id: string;
  slug: string;
  name: string;
  category: CardTemplateCategory;
  preview_image_url: string | null;
  front_background_url: string;
  back_background_url: string;
  design_config: DesignConfig;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  industries?: { id: string; name: string; slug: string }[];
};

export type Customer = {
  id: string;
  organization_id: string;
  created_by: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  province_or_state: string;
  postal_or_zip: string;
  country_code: string;
  created_at?: string;
  updated_at?: string;
};

export type GreetingCardFieldValues = {
  customer_name?: string;
  personal_message?: string;
  sender_name?: string;
  sender_title?: string;
  phone?: string;
  email_address?: string;
  website?: string;
  footer_note?: string;
  company_logo?: string;
  profile_image?: string;
  [key: string]: string | undefined;
};

export type GreetingCard = {
  id: string;
  organization_id: string;
  created_by: string;
  template_id: string;
  customer_id: string;
  field_values: GreetingCardFieldValues;
  status: GreetingCardStatus;
  front_artwork_url: string | null;
  back_artwork_url: string | null;
  created_at?: string;
  updated_at?: string;
  sent_at?: string | null;
  template?: CardTemplate | null;
  customer?: Customer | null;
};

export type QrToken = {
  id: string;
  token: string;
  greeting_card_id: string;
  scan_count: number;
  first_scanned_at: string | null;
  created_at?: string;
};

export type CardResponse = {
  id: string;
  greeting_card_id: string;
  qr_token_id: string;
  response_type: CardResponseType;
  message: string | null;
  created_at?: string;
  greeting_card?: GreetingCard | null;
  customer?: Customer | null;
};

export type MailProvider = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
};

export type MailProviderConfig = {
  id: string;
  provider_id: string;
  environment: MailEnvironment;
  settings: Record<string, unknown>;
  is_active: boolean;
  provider?: MailProvider | null;
};

export type MailTransaction = {
  id: string;
  greeting_card_id: string;
  provider_id: string;
  provider_mail_id: string | null;
  internal_status: GreetingCardStatus;
  provider_status_raw: string | null;
  request_payload?: Record<string, unknown> | null;
  response_payload?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type OrganizationBranding = {
  organization_id: string;
  logo_url: string | null;
  sender_display_name: string | null;
  return_address_line1: string | null;
  return_address_line2: string | null;
  return_city: string | null;
  return_province_or_state: string | null;
  return_postal_or_zip: string | null;
  return_country_code: string;
};

export type PublicRespondPayload = {
  token: string;
  customerFirstName: string;
  senderName: string;
  senderTitle: string | null;
  profileImageUrl: string | null;
  occasionLabel: string;
  personalMessage: string | null;
  organizationName: string | null;
};

export const CARD_STATUS_LABELS: Record<GreetingCardStatus, string> = {
  draft: "Draft",
  ready_to_send: "Ready to Send",
  submitted: "Submitted",
  processing: "Processing",
  mailed: "Mailed",
  delivered: "Delivered",
  qr_scanned: "QR Scanned",
  response_received: "Response Received",
};

export const TEMPLATE_CATEGORY_LABELS: Record<CardTemplateCategory, string> = {
  birthday: "Birthday",
  anniversary: "Anniversary",
  home_anniversary: "Home Anniversary",
  holiday: "Holiday Greetings",
  thank_you: "Thank You",
  congratulations: "Congratulations",
  welcome_home: "Welcome Home",
  customer_appreciation: "Customer Appreciation",
};
