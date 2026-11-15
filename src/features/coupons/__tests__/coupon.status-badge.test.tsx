import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { CouponStatusBadge } from "../components/CouponStatusBadge";

describe("CouponStatusBadge Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Expired badge when isExpired is true", () => {
    render(
      <CouponStatusBadge
        status="active"
        validUntil="2020-01-01T00:00:00.000Z"
        isExpired={true}
      />
    );
    expect(screen.getByText("Expired")).toBeDefined();
  });

  it("renders Inactive badge when status is inactive and not expired", () => {
    render(
      <CouponStatusBadge
        status="inactive"
        validUntil="2099-01-01T00:00:00.000Z"
        isExpired={false}
      />
    );
    expect(screen.getByText("Inactive")).toBeDefined();
  });

  it("renders Active badge when status is active and not expired", () => {
    render(
      <CouponStatusBadge
        status="active"
        validUntil="2099-01-01T00:00:00.000Z"
        isExpired={false}
      />
    );
    expect(screen.getByText("Active")).toBeDefined();
  });

  it("does not render unapproved Expiring Soon threshold", () => {
    // 1 hour before expiry
    const soon = new Date(Date.now() + 3600 * 1000).toISOString();
    render(
      <CouponStatusBadge
        status="active"
        validUntil={soon}
        isExpired={false}
      />
    );
    expect(screen.queryByText("Expiring Soon")).toBeNull();
    expect(screen.getByText("Active")).toBeDefined();
  });
});
