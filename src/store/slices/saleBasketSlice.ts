import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface BasketCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
}

export interface BasketAppointmentLine {
  appointmentId: string;
  appointmentCode: string;
  serviceId?: string;
  categoryId?: string;
  name: string;
  duration?: number;
  unitPrice: number;
  quantity: number;
  isCoveredBySubscription?: boolean;
  appliedSubscriptionId?: string | null;
  subscriptionCode?: string | null;
  appliedCustomerMembershipId?: string | null;
  membershipCode?: string | null;
  membershipDiscountAmount?: number;
  membershipDiscountPercentage?: number;
}

export interface BasketProductLine {
  productId: string;
  sku?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  stockUnit?: string;
  availableStock?: number;
  soldByStaffId?: string | null;
}

export interface BasketSubscriptionLine {
  planId: string;
  subscriptionId?: string;
  name: string;
  code?: string;
  suggestedPrice: number;
  validityMonths?: number;
  entitlements?: { serviceId: string; quantity: number }[];
  soldByStaffId?: string | null;
}

export interface BasketMembershipLine {
  membershipPlanId: string;
  customerMembershipId?: string;
  membershipPurchaseId?: string;
  membershipCode?: string;
  isExistingPending?: boolean;
  name: string;
  code?: string;
  tier: string;
  price: number;
  validityMonths?: number;
  serviceDiscountPercentage: number;
  productDiscountPercentage: number;
  soldByStaffId?: string | null;
  payerCustomerId?: string;
  beneficiaryCustomerIds?: string[];
  beneficiaries?: Array<{
    customerId: string;
    benefits?: {
      serviceDiscountPercentage?: number;
      productDiscountPercentage?: number;
      complimentaryPerks?: string[];
      eligibleServiceCategoryIds?: string[];
      eligibleServiceIds?: string[];
      excludedServiceCategoryIds?: string[];
      excludedServiceIds?: string[];
    };
  }>;
}

export interface BasketWalkinServiceLine {
  serviceId: string;
  categoryId?: string;
  name: string;
  duration?: number;
  unitPrice: number;
  quantity: number;
  isCoveredBySubscription?: boolean;
  appliedSubscriptionId?: string | null;
  subscriptionCode?: string | null;
  performedByStaffId?: string | null;
}

export interface SaleBasketState {
  customer: BasketCustomer | null;
  appointment: {
    appointmentId: string;
    appointmentCode: string;
  } | null;
  appointmentLines: BasketAppointmentLine[];
  productLines: BasketProductLine[];
  subscriptionLines: BasketSubscriptionLine[];
  membershipLines: BasketMembershipLine[];
  walkinServiceLines: BasketWalkinServiceLine[];
  discountTotal: number;
  redeemLoyaltyPoints: number;
  notes: string;
  existingDraftInvoiceId: string | null;
  existingDraftInvoiceNumber: string | null;
}

const STORAGE_KEY = "unisex_parlour_sale_basket";

const loadPersistedState = (): SaleBasketState => {
  if (typeof window === "undefined") {
    return getInitialEmptyState();
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialEmptyState();
    return JSON.parse(raw);
  } catch {
    return getInitialEmptyState();
  }
};

const savePersistedState = (state: SaleBasketState) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota limits
  }
};

function getInitialEmptyState(): SaleBasketState {
  return {
    customer: null,
    appointment: null,
    appointmentLines: [],
    productLines: [],
    subscriptionLines: [],
    membershipLines: [],
    walkinServiceLines: [],
    discountTotal: 0,
    redeemLoyaltyPoints: 0,
    notes: "",
    existingDraftInvoiceId: null,
    existingDraftInvoiceNumber: null,
  };
}

const initialState: SaleBasketState = getInitialEmptyState();

export const saleBasketSlice = createSlice({
  name: "saleBasket",
  initialState,
  reducers: {
    hydrateFromSession: (state) => {
      const persisted = loadPersistedState();
      Object.assign(state, persisted);
    },

    setBasketCustomer: (state, action: PayloadAction<BasketCustomer | null>) => {
      // If switching customer with an active basket, clear if customer mismatch
      if (state.customer && action.payload && state.customer.id !== action.payload.id) {
        state.appointment = null;
        state.appointmentLines = [];
        state.productLines = [];
        state.subscriptionLines = [];
        state.membershipLines = [];
        state.walkinServiceLines = [];
        state.discountTotal = 0;
        state.redeemLoyaltyPoints = 0;
        state.existingDraftInvoiceId = null;
        state.existingDraftInvoiceNumber = null;
      }
      state.customer = action.payload;
      savePersistedState(state);
    },

    setBasketAppointment: (
      state,
      action: PayloadAction<{
        appointmentId: string;
        appointmentCode: string;
        customer: BasketCustomer;
        services: BasketAppointmentLine[];
        existingDraftInvoice?: { id: string; invoiceNumber: string } | null;
      }>
    ) => {
      const { appointmentId, appointmentCode, customer, services, existingDraftInvoice } = action.payload;
      // Customer consistency check
      if (state.customer && state.customer.id !== customer.id) {
        state.productLines = [];
        state.subscriptionLines = [];
        state.membershipLines = [];
        state.walkinServiceLines = [];
      }
      state.customer = customer;
      state.appointment = { appointmentId, appointmentCode };
      state.appointmentLines = services;
      if (existingDraftInvoice) {
        state.existingDraftInvoiceId = existingDraftInvoice.id;
        state.existingDraftInvoiceNumber = existingDraftInvoice.invoiceNumber;
      } else {
        state.existingDraftInvoiceId = null;
        state.existingDraftInvoiceNumber = null;
      }
      savePersistedState(state);
    },

    clearBasketAppointment: (state) => {
      state.appointment = null;
      state.appointmentLines = [];
      state.existingDraftInvoiceId = null;
      state.existingDraftInvoiceNumber = null;
      savePersistedState(state);
    },

    addProductToBasket: (state, action: PayloadAction<BasketProductLine>) => {
      const existing = state.productLines.find((p) => p.productId === action.payload.productId);
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.productLines.push(action.payload);
      }
      savePersistedState(state);
    },

    updateProductBasketQuantity: (
      state,
      action: PayloadAction<{ productId: string; quantity: number }>
    ) => {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        state.productLines = state.productLines.filter((p) => p.productId !== productId);
      } else {
        const item = state.productLines.find((p) => p.productId === productId);
        if (item) item.quantity = quantity;
      }
      savePersistedState(state);
    },

    removeProductFromBasket: (state, action: PayloadAction<string>) => {
      state.productLines = state.productLines.filter((p) => p.productId !== action.payload);
      savePersistedState(state);
    },
    setProductSeller: (
      state,
      action: PayloadAction<{ productId: string; staffId: string | null }>,
    ) => {
      const line = state.productLines.find((item) => item.productId === action.payload.productId);
      if (line) line.soldByStaffId = action.payload.staffId;
      savePersistedState(state);
    },

    addSubscriptionToBasket: (state, action: PayloadAction<BasketSubscriptionLine>) => {
      const existing = state.subscriptionLines.find(
        (s) =>
          (action.payload.subscriptionId && s.subscriptionId === action.payload.subscriptionId) ||
          (!action.payload.subscriptionId && s.planId === action.payload.planId)
      );
      if (!existing) {
        state.subscriptionLines.push(action.payload);
      }
      savePersistedState(state);
    },

    removeSubscriptionFromBasket: (state, action: PayloadAction<string>) => {
      state.subscriptionLines = state.subscriptionLines.filter(
        (s) => s.planId !== action.payload && s.subscriptionId !== action.payload
      );
      savePersistedState(state);
    },
    setSubscriptionSeller: (
      state,
      action: PayloadAction<{ planId: string; staffId: string | null }>,
    ) => {
      const line = state.subscriptionLines.find(
        (item) => item.planId === action.payload.planId,
      );
      if (line) line.soldByStaffId = action.payload.staffId;
      savePersistedState(state);
    },

    addMembershipToBasket: (state, action: PayloadAction<BasketMembershipLine>) => {
      // Typically 1 active membership in cart, but support replacing or keeping single membership line
      const existingIndex = state.membershipLines.findIndex(
        (m) =>
          (action.payload.customerMembershipId && m.customerMembershipId === action.payload.customerMembershipId) ||
          (action.payload.membershipPurchaseId && m.membershipPurchaseId === action.payload.membershipPurchaseId) ||
          (!action.payload.customerMembershipId && m.membershipPlanId === action.payload.membershipPlanId),
      );
      if (existingIndex >= 0) {
        state.membershipLines[existingIndex] = action.payload;
      } else {
        // Enforce 1 membership line in basket
        state.membershipLines = [action.payload];
      }
      savePersistedState(state);
    },

    removeMembershipFromBasket: (state, action: PayloadAction<string>) => {
      state.membershipLines = state.membershipLines.filter(
        (m) =>
          m.membershipPlanId !== action.payload &&
          m.customerMembershipId !== action.payload &&
          m.membershipPurchaseId !== action.payload,
      );
      savePersistedState(state);
    },
    setMembershipSeller: (
      state,
      action: PayloadAction<{ membershipPlanId?: string; customerMembershipId?: string; staffId: string | null }>,
    ) => {
      const line = state.membershipLines.find((item) =>
        action.payload.customerMembershipId
          ? item.customerMembershipId === action.payload.customerMembershipId
          : item.membershipPlanId === action.payload.membershipPlanId,
      );
      if (line) line.soldByStaffId = action.payload.staffId;
      savePersistedState(state);
    },

    recalculateSubscriptionCoverage: (
      state,
      action: PayloadAction<{
        subscriptions: Array<{
          id: string;
          subscriptionCode: string;
          entitlements: Array<{
            serviceId: string;
            remainingQuantity: number;
          }>;
        }>;
      }>,
    ) => {
      // Build mutable tracking pool for remaining service entitlements
      const remainingEntitlements = new Map<string, Array<{ id: string; code: string; remaining: number }>>();
      for (const sub of action.payload.subscriptions) {
        for (const ent of sub.entitlements || []) {
          if (ent.remainingQuantity > 0) {
            const list = remainingEntitlements.get(ent.serviceId) || [];
            list.push({
              id: sub.id,
              code: sub.subscriptionCode,
              remaining: ent.remainingQuantity,
            });
            remainingEntitlements.set(ent.serviceId, list);
          }
        }
      }

      // Check walkin services and cover eligible lines up to quota
      for (const s of state.walkinServiceLines) {
        const pool = remainingEntitlements.get(s.serviceId);
        if (pool && pool.length > 0) {
          const firstAvailable = pool.find((item) => item.remaining > 0);
          if (firstAvailable) {
            s.isCoveredBySubscription = true;
            s.appliedSubscriptionId = firstAvailable.id;
            s.subscriptionCode = firstAvailable.code;
            firstAvailable.remaining -= s.quantity;
            continue;
          }
        }
        // If not covered by available quota, clear coverage flag
        s.isCoveredBySubscription = false;
        s.appliedSubscriptionId = null;
        s.subscriptionCode = null;
      }

      // Check appointment services and cover eligible lines up to quota
      for (const apt of state.appointmentLines) {
        if (!apt.serviceId) continue;
        const pool = remainingEntitlements.get(apt.serviceId);
        if (pool && pool.length > 0) {
          const firstAvailable = pool.find((item) => item.remaining > 0);
          if (firstAvailable) {
            apt.isCoveredBySubscription = true;
            apt.appliedSubscriptionId = firstAvailable.id;
            apt.subscriptionCode = firstAvailable.code;
            firstAvailable.remaining -= apt.quantity;
            continue;
          }
        }
      }

      savePersistedState(state);
    },

    addWalkinServiceToBasket: (state, action: PayloadAction<BasketWalkinServiceLine>) => {
      const existing = state.walkinServiceLines.find((s) => s.serviceId === action.payload.serviceId);
      if (existing) {
        existing.quantity += action.payload.quantity;
        if (action.payload.isCoveredBySubscription !== undefined) {
          existing.isCoveredBySubscription = action.payload.isCoveredBySubscription;
          existing.appliedSubscriptionId = action.payload.appliedSubscriptionId;
          existing.subscriptionCode = action.payload.subscriptionCode;
        }
      } else {
        state.walkinServiceLines.push(action.payload);
      }
      savePersistedState(state);
    },

    toggleWalkinServiceSubscription: (
      state,
      action: PayloadAction<{
        serviceId: string;
        isCovered: boolean;
        appliedSubscriptionId?: string | null;
        subscriptionCode?: string | null;
      }>
    ) => {
      const item = state.walkinServiceLines.find((s) => s.serviceId === action.payload.serviceId);
      if (item) {
        item.isCoveredBySubscription = action.payload.isCovered;
        item.appliedSubscriptionId = action.payload.isCovered ? action.payload.appliedSubscriptionId || null : null;
        item.subscriptionCode = action.payload.isCovered ? action.payload.subscriptionCode || null : null;
      }
      savePersistedState(state);
    },

    updateWalkinServiceQuantity: (
      state,
      action: PayloadAction<{ serviceId: string; quantity: number }>
    ) => {
      const { serviceId, quantity } = action.payload;
      if (quantity <= 0) {
        state.walkinServiceLines = state.walkinServiceLines.filter((s) => s.serviceId !== serviceId);
      } else {
        const item = state.walkinServiceLines.find((s) => s.serviceId === serviceId);
        if (item) item.quantity = quantity;
      }
      savePersistedState(state);
    },
    setWalkinServicePerformer: (
      state,
      action: PayloadAction<{ serviceId: string; staffId: string | null }>,
    ) => {
      const line = state.walkinServiceLines.find(
        (item) => item.serviceId === action.payload.serviceId,
      );
      if (line) line.performedByStaffId = action.payload.staffId;
      savePersistedState(state);
    },

    removeWalkinServiceFromBasket: (state, action: PayloadAction<string>) => {
      state.walkinServiceLines = state.walkinServiceLines.filter((s) => s.serviceId !== action.payload);
      savePersistedState(state);
    },

    setBasketDiscount: (state, action: PayloadAction<number>) => {
      state.discountTotal = Math.max(0, Number(action.payload) || 0);
      savePersistedState(state);
    },

    setBasketLoyaltyRedemption: (state, action: PayloadAction<number>) => {
      state.redeemLoyaltyPoints = Math.max(0, Math.floor(Number(action.payload) || 0));
      savePersistedState(state);
    },

    setBasketNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload;
      savePersistedState(state);
    },

    setExistingDraft: (
      state,
      action: PayloadAction<{ id: string; invoiceNumber: string } | null>
    ) => {
      if (action.payload) {
        state.existingDraftInvoiceId = action.payload.id;
        state.existingDraftInvoiceNumber = action.payload.invoiceNumber;
      } else {
        state.existingDraftInvoiceId = null;
        state.existingDraftInvoiceNumber = null;
      }
      savePersistedState(state);
    },

    clearSaleBasket: (state) => {
      const empty = getInitialEmptyState();
      Object.assign(state, empty);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          // Ignore
        }
      }
    },
  },
});

export const {
  hydrateFromSession,
  setBasketCustomer,
  setBasketAppointment,
  clearBasketAppointment,
  addProductToBasket,
  updateProductBasketQuantity,
  removeProductFromBasket,
  setProductSeller,
  addSubscriptionToBasket,
  removeSubscriptionFromBasket,
  setSubscriptionSeller,
  addMembershipToBasket,
  removeMembershipFromBasket,
  setMembershipSeller,
  addWalkinServiceToBasket,
  updateWalkinServiceQuantity,
  setWalkinServicePerformer,
  toggleWalkinServiceSubscription,
  removeWalkinServiceFromBasket,
  setBasketDiscount,
  setBasketLoyaltyRedemption,
  setBasketNotes,
  setExistingDraft,
  recalculateSubscriptionCoverage,
  clearSaleBasket,
} = saleBasketSlice.actions;

export default saleBasketSlice.reducer;

