import { describe, it, expect, beforeEach } from "vitest";
import reducer, {
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
  clearSaleBasket,
  SaleBasketState,
} from "../saleBasketSlice";

describe("saleBasketSlice Redux store", () => {
  let initialState: SaleBasketState;

  beforeEach(() => {
    initialState = {
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
  });

  it("sets customer and clears basket when customer switches", () => {
    const stateWithItem: SaleBasketState = {
      ...initialState,
      customer: { id: "cust-1", name: "Alice", phone: "1234567890" },
      productLines: [
        { productId: "p1", name: "Shampoo", unitPrice: 200, quantity: 1 },
      ],
    };

    const nextState = reducer(
      stateWithItem,
      setBasketCustomer({ id: "cust-2", name: "Bob", phone: "9876543210" }),
    );

    expect(nextState.customer?.id).toBe("cust-2");
    expect(nextState.productLines).toHaveLength(0); // Cleared on customer switch
  });

  it("adds and updates product quantities", () => {
    let state = reducer(
      initialState,
      addProductToBasket({
        productId: "prod-1",
        name: "Hair Gel",
        unitPrice: 150,
        quantity: 1,
      }),
    );
    expect(state.productLines).toHaveLength(1);
    expect(state.productLines[0].quantity).toBe(1);

    // Add same product -> increments quantity
    state = reducer(
      state,
      addProductToBasket({
        productId: "prod-1",
        name: "Hair Gel",
        unitPrice: 150,
        quantity: 2,
      }),
    );
    expect(state.productLines[0].quantity).toBe(3);

    // Update quantity directly
    state = reducer(
      state,
      updateProductBasketQuantity({ productId: "prod-1", quantity: 5 }),
    );
    expect(state.productLines[0].quantity).toBe(5);

    // Remove product
    state = reducer(state, removeProductFromBasket("prod-1"));
    expect(state.productLines).toHaveLength(0);
  });

  it("supports appointment, subscriptions, memberships, and walkin services together", () => {
    let state = reducer(
      initialState,
      setBasketAppointment({
        appointmentId: "apt-1",
        appointmentCode: "APT-001",
        customer: { id: "cust-1", name: "John", phone: "1112223333" },
        services: [
          {
            appointmentId: "apt-1",
            appointmentCode: "APT-001",
            name: "Hair Cut",
            unitPrice: 300,
            quantity: 1,
          },
        ],
      }),
    );

    state = reducer(
      state,
      addSubscriptionToBasket({
        planId: "sub-plan-1",
        name: "Gold Package",
        suggestedPrice: 2500,
      }),
    );

    state = reducer(
      state,
      addMembershipToBasket({
        membershipPlanId: "mem-plan-1",
        name: "VIP Membership",
        tier: "Gold",
        price: 1500,
        serviceDiscountPercentage: 15,
        productDiscountPercentage: 10,
      }),
    );

    state = reducer(
      state,
      addWalkinServiceToBasket({
        serviceId: "svc-2",
        name: "Beard Trim",
        unitPrice: 150,
        quantity: 1,
      }),
    );

    expect(state.appointment?.appointmentCode).toBe("APT-001");
    expect(state.appointmentLines).toHaveLength(1);
    expect(state.subscriptionLines).toHaveLength(1);
    expect(state.membershipLines).toHaveLength(1);
    expect(state.walkinServiceLines).toHaveLength(1);

    // Clear whole basket
    state = reducer(state, clearSaleBasket());
    expect(state.customer).toBeNull();
    expect(state.appointmentLines).toHaveLength(0);
  });
});
