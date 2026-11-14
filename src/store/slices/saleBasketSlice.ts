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
  name: string;
  duration?: number;
  unitPrice: number;
  quantity: number;
  isCoveredBySubscription?: boolean;
  appliedSubscriptionId?: string | null;
  subscriptionCode?: string | null;
}

export interface BasketProductLine {
  productId: string;
  sku?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  stockUnit?: string;
  availableStock?: number;
}

export interface BasketSubscriptionLine {
  planId: string;
  subscriptionId?: string;
  name: string;
  code?: string;
  suggestedPrice: number;
  validityMonths?: number;
  entitlements?: { serviceId: string; quantity: number }[];
}

export interface BasketMembershipLine {
  membershipPlanId: string;
  name: string;
  code?: string;
  tier: string;
  price: number;
  validityMonths?: number;
  serviceDiscountPercentage: number;
  productDiscountPercentage: number;
}

export interface BasketWalkinServiceLine {
  serviceId: string;
  name: string;
  duration?: number;
  unitPrice: number;
  quantity: number;
  isCoveredBySubscription?: boolean;
  appliedSubscriptionId?: string | null;
  subscriptionCode?: string | null;
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

    addMembershipToBasket: (state, action: PayloadAction<BasketMembershipLine>) => {
      // Typically only 1 active membership plan in cart
      state.membershipLines = [action.payload];
      savePersistedState(state);
    },

    removeMembershipFromBasket: (state, action: PayloadAction<string>) => {
      state.membershipLines = state.membershipLines.filter((m) => m.membershipPlanId !== action.payload);
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
  addSubscriptionToBasket,
  removeSubscriptionFromBasket,
  addMembershipToBasket,
  removeMembershipFromBasket,
  addWalkinServiceToBasket,
  updateWalkinServiceQuantity,
  toggleWalkinServiceSubscription,
  removeWalkinServiceFromBasket,
  setBasketDiscount,
  setBasketLoyaltyRedemption,
  setBasketNotes,
  setExistingDraft,
  clearSaleBasket,
} = saleBasketSlice.actions;

export default saleBasketSlice.reducer;

