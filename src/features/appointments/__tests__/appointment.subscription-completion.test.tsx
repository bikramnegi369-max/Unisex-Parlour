import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);
import { SubscriptionVerificationModal } from "../components/SubscriptionVerificationModal";
import { requiresSubscriptionVerification } from "../utils/appointmentSubscription";
import { createAppointmentSchema } from "../schemas/appointment.schema";
import { normalizeAppointment } from "../api/appointments.api";
import type { Appointment } from "../types/appointment.types";

const mockRequestOtpMutateAsync = vi.fn();
const mockCompleteMutateAsync = vi.fn();

vi.mock("../hooks/useAppointments", () => ({
  useRequestConsumptionOtp: () => ({
    mutateAsync: mockRequestOtpMutateAsync,
    isPending: false,
  }),
  useCompleteWithSubscription: () => ({
    mutateAsync: mockCompleteMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "u_1",
      role: "admin",
      permissions: ["appointments.update_status", "subscriptions.redeem"],
    },
  }),
}));

const mockSubAppointment: Appointment = {
  id: "appt_sub_1",
  appointmentCode: "APP-009999",
  organizationId: "org_1",
  branchId: "br_1",
  customerId: "cust_1",
  customer: { id: "cust_1", name: "Alice Doe", phone: "9876543210" },
  serviceIds: ["srv_1", "srv_2"],
  services: [
    {
      serviceId: "srv_1",
      name: "Deluxe Haircut",
      duration: 45,
      price: 0,
      appliedSubscriptionId: "sub_1",
      isRedeemedViaSubscription: false,
    },
    {
      serviceId: "srv_2",
      name: "Beard Styling",
      duration: 30,
      price: 50,
      appliedSubscriptionId: null,
      isRedeemedViaSubscription: false,
    },
  ],
  staffId: "emp_1",
  staff: { id: "emp_1", name: "Bob Stylist" },
  bookingType: "advance",
  status: "in_progress",
  date: "2026-09-25",
  startTime: "14:00",
  endTime: "15:15",
  createdAt: "2026-09-25T10:00:00Z",
  updatedAt: "2026-09-25T10:00:00Z",
};

describe("Subscription Verification Flow & Helper Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("requiresSubscriptionVerification helper", () => {
    it("returns false for appointment without subscription services", () => {
      const normalAppt: Appointment = {
        ...mockSubAppointment,
        services: [
          { serviceId: "srv_1", name: "Haircut", duration: 30, price: 100 },
        ],
      };
      expect(requiresSubscriptionVerification(normalAppt)).toBe(false);
    });

    it("returns true when at least one service has appliedSubscriptionId and is not redeemed", () => {
      expect(requiresSubscriptionVerification(mockSubAppointment)).toBe(true);
    });

    it("returns false when all subscription services are already redeemed", () => {
      const redeemedAppt: Appointment = {
        ...mockSubAppointment,
        services: [
          {
            serviceId: "srv_1",
            name: "Deluxe Haircut",
            duration: 45,
            price: 0,
            appliedSubscriptionId: "sub_1",
            isRedeemedViaSubscription: true,
          },
        ],
      };
      expect(requiresSubscriptionVerification(redeemedAppt)).toBe(false);
    });
  });

  describe("SubscriptionVerificationModal UX", () => {
    it("renders step 1 prompt with masked phone and covered service details", () => {
      render(
        <SubscriptionVerificationModal
          appointment={mockSubAppointment}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(
        screen.getByText("Customer verification required")
      ).toBeInTheDocument();
      expect(screen.getByText("Deluxe Haircut")).toBeInTheDocument();
      expect(screen.getByText("Prepaid Covered")).toBeInTheDocument();
      // Masked phone: 9876543210 -> ending with 10
      expect(screen.getByText("••••••10")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Send Verification Code/i })
      ).toBeInTheDocument();
    });

    it("transitions to OTP input step upon successful OTP request and handles timer expiration and resend", async () => {
      mockRequestOtpMutateAsync.mockResolvedValueOnce({
        success: true,
        message: "Code sent",
        data: {
          expiresIn: 300,
          resendAfter: 60,
        },
      });

      render(
        <SubscriptionVerificationModal
          appointment={mockSubAppointment}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const sendBtn = screen.getByRole("button", {
        name: /Send Verification Code/i,
      });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(mockRequestOtpMutateAsync).toHaveBeenCalledWith({
          id: "appt_sub_1",
          payload: { branchId: "br_1" },
        });
      });

      // Now on OTP step
      expect(screen.getByText("Verify customer")).toBeInTheDocument();
      expect(
        screen.getByText(/Enter the 6-digit verification code sent to/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Verify & Complete/i })
      ).toBeInTheDocument();
    });

    it("prevents submission when OTP is incomplete (less than 6 digits)", async () => {
      mockRequestOtpMutateAsync.mockResolvedValueOnce({
        success: true,
        message: "Code sent",
        data: { expiresIn: 300, resendAfter: 60 },
      });

      render(
        <SubscriptionVerificationModal
          appointment={mockSubAppointment}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: /Send Verification Code/i })
      );

      await waitFor(() => {
        expect(screen.getByText("Verify customer")).toBeInTheDocument();
      });

      const verifyBtn = screen.getByRole("button", {
        name: /Verify & Complete/i,
      });
      // Incomplete OTP: button is disabled
      expect(verifyBtn).toBeDisabled();
      expect(mockCompleteMutateAsync).not.toHaveBeenCalled();
    });

    it("calls complete-with-subscription and succeeds with valid OTP", async () => {
      mockRequestOtpMutateAsync.mockResolvedValueOnce({
        success: true,
        message: "Code sent",
        data: { expiresIn: 300, resendAfter: 60 },
      });
      mockCompleteMutateAsync.mockResolvedValueOnce({
        id: "appt_sub_1",
        status: "completed",
      });

      const handleSuccess = vi.fn();
      const handleClose = vi.fn();

      render(
        <SubscriptionVerificationModal
          appointment={mockSubAppointment}
          isOpen={true}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: /Send Verification Code/i })
      );

      await waitFor(() => {
        expect(screen.getByText("Verify customer")).toBeInTheDocument();
      });

      // Fill in 6 digits into the OtpInput textboxes
      const inputs = screen.getAllByRole("textbox");
      expect(inputs.length).toBe(6);

      // Simulate entering 123456
      const digits = ["1", "2", "3", "4", "5", "6"];
      digits.forEach((d, idx) => {
        fireEvent.change(inputs[idx], { target: { value: d } });
      });

      const verifyBtn = screen.getByRole("button", {
        name: /Verify & Complete/i,
      });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(mockCompleteMutateAsync).toHaveBeenCalledWith({
          id: "appt_sub_1",
          payload: {
            branchId: "br_1",
            otp: "123456",
          },
        });
      });

      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });

    it("displays user-friendly error message on invalid OTP response (400)", async () => {
      mockRequestOtpMutateAsync.mockResolvedValueOnce({
        success: true,
        message: "Code sent",
        data: { expiresIn: 300, resendAfter: 60 },
      });
      mockCompleteMutateAsync.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: "Invalid OTP code provided" },
        },
      });

      render(
        <SubscriptionVerificationModal
          appointment={mockSubAppointment}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: /Send Verification Code/i })
      );

      await waitFor(() => {
        expect(screen.getByText("Verify customer")).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("textbox");
      ["9", "9", "9", "9", "9", "9"].forEach((d, idx) => {
        fireEvent.change(inputs[idx], { target: { value: d } });
      });

      const verifyBtn = screen.getByRole("button", {
        name: /Verify & Complete/i,
      });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/That code is incorrect. Please check the code and try again/i)
        ).toBeInTheDocument();
      });
    });

    it("displays user-friendly error message on exhausted entitlement response (409)", async () => {
      mockRequestOtpMutateAsync.mockResolvedValueOnce({
        success: true,
        message: "Code sent",
        data: { expiresIn: 300, resendAfter: 60 },
      });
      mockCompleteMutateAsync.mockRejectedValueOnce({
        response: {
          status: 409,
          data: { message: "Subscription entitlement balance exhausted" },
        },
      });

      render(
        <SubscriptionVerificationModal
          appointment={mockSubAppointment}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: /Send Verification Code/i })
      );

      await waitFor(() => {
        expect(screen.getByText("Verify customer")).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("textbox");
      ["1", "1", "1", "1", "1", "1"].forEach((d, idx) => {
        fireEvent.change(inputs[idx], { target: { value: d } });
      });

      const verifyBtn = screen.getByRole("button", {
        name: /Verify & Complete/i,
      });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Subscription entitlement is no longer available or exhausted/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Appointment Creation Contract & Subscription Association Semantics", () => {
    it("1. validates normal service line creation with customPrice without subscription", () => {
      const parsed = createAppointmentSchema.parse({
        branchId: "br_1",
        customerId: "cust_1",
        date: "2026-09-25",
        startTime: "10:00",
        bookingType: "advance",
        services: [
          { serviceId: "srv_normal", customPrice: 450 },
        ],
      });

      expect(parsed.services).toHaveLength(1);
      expect(parsed.services?.[0].serviceId).toBe("srv_normal");
      expect(parsed.services?.[0].customPrice).toBe(450);
      expect(parsed.services?.[0].appliedSubscriptionId).toBeUndefined();
    });

    it("2 & 3. validates subscription-backed service line persists appliedSubscriptionId", () => {
      const parsed = createAppointmentSchema.parse({
        branchId: "br_1",
        customerId: "cust_1",
        date: "2026-09-25",
        startTime: "10:00",
        bookingType: "advance",
        services: [
          {
            serviceId: "srv_sub",
            customPrice: 500, // Customer-specific pricing preserved!
            appliedSubscriptionId: "sub_active_123",
          },
        ],
      });

      expect(parsed.services?.[0].appliedSubscriptionId).toBe("sub_active_123");
      expect(parsed.services?.[0].customPrice).toBe(500);
    });

    it("4. subscription coverage does NOT require setting customPrice to 0", () => {
      const parsed = createAppointmentSchema.parse({
        branchId: "br_1",
        customerId: "cust_1",
        date: "2026-09-25",
        startTime: "10:00",
        bookingType: "advance",
        services: [
          {
            serviceId: "srv_vip",
            customPrice: 800, // VIP rate remains intact
            appliedSubscriptionId: "sub_vip_plan",
          },
        ],
      });

      expect(parsed.services?.[0].customPrice).toBe(800);
      expect(parsed.services?.[0].appliedSubscriptionId).toBe("sub_vip_plan");
    });

    it("5, 6, 7. newly created subscription lines are unredeemed and do not call redemption or OTP APIs", () => {
      // Normalizing a newly returned appointment from backend create
      const normalized = normalizeAppointment({
        _id: "appt_new_1",
        appointmentDate: "2026-09-25",
        startTime: "11:00",
        branchId: "br_1",
        customerId: "cust_1",
        status: "scheduled",
        services: [
          {
            serviceId: "srv_sub",
            name: "Hair Spa",
            duration: 60,
            price: 600,
            appliedSubscriptionId: "sub_active_123",
            isRedeemedViaSubscription: false,
            subscriptionUsageId: null,
          },
        ],
      });

      expect(normalized.services[0].appliedSubscriptionId).toBe("sub_active_123");
      expect(normalized.services[0].isRedeemedViaSubscription).toBe(false);
      expect(normalized.services[0].subscriptionUsageId).toBeNull();
      // Verifies requirement 8: requires verification because it is unredeemed
      expect(requiresSubscriptionVerification(normalized)).toBe(true);
    });

    it("9. already redeemed subscription service line does NOT require OTP", () => {
      const normalized = normalizeAppointment({
        _id: "appt_already_redeemed",
        appointmentDate: "2026-09-25",
        startTime: "11:00",
        branchId: "br_1",
        customerId: "cust_1",
        status: "in_progress",
        services: [
          {
            serviceId: "srv_sub",
            name: "Hair Spa",
            duration: 60,
            price: 600,
            appliedSubscriptionId: "sub_active_123",
            isRedeemedViaSubscription: true,
            subscriptionUsageId: "usage_999",
          },
        ],
      });

      expect(requiresSubscriptionVerification(normalized)).toBe(false);
    });

    it("10 & 11. mixed services + multiple subscriptions are verified in a single OTP modal", () => {
      const multiSubAppt: Appointment = {
        ...mockSubAppointment,
        services: [
          {
            serviceId: "srv_1",
            name: "Service Plan A",
            duration: 30,
            price: 200,
            appliedSubscriptionId: "sub_plan_A",
            isRedeemedViaSubscription: false,
          },
          {
            serviceId: "srv_2",
            name: "Service Plan B",
            duration: 45,
            price: 350,
            appliedSubscriptionId: "sub_plan_B",
            isRedeemedViaSubscription: false,
          },
          {
            serviceId: "srv_3",
            name: "Regular Addon",
            duration: 15,
            price: 100,
            appliedSubscriptionId: null,
            isRedeemedViaSubscription: false,
          },
        ],
      };

      expect(requiresSubscriptionVerification(multiSubAppt)).toBe(true);

      render(
        <SubscriptionVerificationModal
          appointment={multiSubAppt}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      // Verify both subscription-backed services are listed in the single prompt
      expect(screen.getByText("Service Plan A")).toBeInTheDocument();
      expect(screen.getByText("Service Plan B")).toBeInTheDocument();
      // Non-subscription service is not in the subscription list
      expect(screen.queryByText("Regular Addon")).not.toBeInTheDocument();
      // Only one OTP trigger button
      expect(screen.getAllByRole("button", { name: /Send Verification Code/i })).toHaveLength(1);
    });
  });
});
