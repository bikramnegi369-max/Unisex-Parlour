export interface Address {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export type AddressObject = Address;

export interface MarketingPreferences {
  sms: boolean;
  email: boolean;
  whatsapp: boolean;
  promotions: boolean;
  appointmentReminders: boolean;
}

export type MarketingPreferencesObject = MarketingPreferences;

export interface CustomerNote {
  _id: string;
  text: string;
  createdBy: string | { _id: string; name: string };
  createdAt: string;
  updatedAt?: string;
}

export type NoteObject = CustomerNote;

export type CustomerStatus = "active" | "inactive" | "blocked";

export type AcquisitionSource =
  | "walk_in"
  | "instagram"
  | "facebook"
  | "google"
  | "website"
  | "advertisement"
  | "referral"
  | "other";

export interface AuditLog {
  _id: string;
  action:
    | "CUSTOMER_CREATED"
    | "CUSTOMER_UPDATED"
    | "CUSTOMER_DEACTIVATED"
    | "CUSTOMER_REACTIVATED"
    | "NOTE_ADDED"
    | string;
  description: string;
  date: string;
  performedBy: string | { _id: string; name: string };
}

export type CustomerActivity = AuditLog;
export type ActivityLogItem = AuditLog;

export interface Customer {
  id: string; // maps to _id from Mongoose
  _id?: string;
  name: string;
  phone: string;
  email?: string | null;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  dateOfBirth?: string | null;
  alternatePhone?: string | null;
  address?: Address;
  organizationId: string;
  homeBranchId: string;
  visitedBranchIds: string[];
  loyaltyPoints: number;
  status: CustomerStatus;
  preferences?: {
    preferredStaff?: string[];
    preferredServices?: string[];
    drinkPreference?: string;
    preferredContactTime?: string;
    language?: string;
    remarks?: string;
  };
  marketingPreferences?: MarketingPreferences;
  doNotContact?: boolean;
  acquisitionSource?: AcquisitionSource;
  referredByCustomerId?: string | null;
  tags?: string[];
  allergies?: string[];
  sensitivities?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResponse {
  success: boolean;
  status: string;
  message?: string;
  data: Customer[];
  meta?: {
    total: number;
    page: string | number;
    limit: string | number;
    totalPages: number;
  };
}

export interface CustomerDetailsResponse {
  success: boolean;
  status: string;
  message?: string;
  data: Customer;
}

export interface CustomerMutateResponse {
  success: boolean;
  status: string;
  message?: string;
  data: Customer;
}

export interface CustomerDeleteResponse {
  success: boolean;
  status: string;
  message?: string;
}

export interface CustomerNotesResponse {
  success: boolean;
  status: string;
  message?: string;
  data: CustomerNote[];
  meta?: {
    total: number;
    page: string | number;
    limit: string | number;
    totalPages: number;
  };
}

export interface CustomerNoteMutateResponse {
  success: boolean;
  status: string;
  message?: string;
  data: CustomerNote;
}

export interface CustomerActivityResponse {
  success: boolean;
  status: string;
  message?: string;
  data: AuditLog[];
  meta?: {
    total: number;
    page: string | number;
    limit: string | number;
    totalPages: number;
  };
}

export function formatAddress(address?: string | Address): string {
  if (!address) return "";
  if (typeof address === "string") return address;
  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);
  return parts.join(", ");
}

export type CustomerPayload = Omit<Partial<Customer>, "id" | "organizationId" | "homeBranchId" | "visitedBranchIds" | "isActive">;


