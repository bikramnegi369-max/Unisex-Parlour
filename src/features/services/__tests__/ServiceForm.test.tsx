// @vitest-environment jsdom
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import ServiceForm from "../components/services/ServiceForm";

describe("ServiceForm Pre-filling", () => {
  afterEach(() => {
    cleanup();
  });

  const categories = [
    {
      id: "6a6c53d9f185420dac19b1dc",
      _id: "6a6c53d9f185420dac19b1dc",
      name: "hair",
      description: "All hair related services",
      status: "active" as const,
      displayOrder: 0,
      organizationId: "6a674eeb35f4849a26cab307",
      branchId: "6a674eeb35f4849a26cab309",
      createdAt: "",
      updatedAt: "",
    },
  ];

  it("correctly pre-fills form fields when passed raw API response object with nested pricing and taxConfiguration", () => {
    const rawService = {
      _id: "6a6c83c579fc79a73740a736",
      id: "6a6c83c579fc79a73740a736",
      name: "sdfghj",
      serviceCode: "SDFGSKC9",
      description: "jk",
      categoryId: {
        _id: "6a6c53d9f185420dac19b1dc",
        name: "hair",
      },
      pricing: {
        basePrice: 120000,
      },
      taxConfiguration: {
        taxable: true,
        taxRate: 13,
      },
      duration: 30,
      status: "active",
      displayOrder: 0,
    };

    render(
      <ServiceForm
        categories={categories}
        initialService={rawService as any}
        onSubmit={vi.fn()}
        isSubmitting={false}
        onCancel={vi.fn()}
        submitLabel="Save Service"
      />
    );

    const nameInput = screen.getByLabelText(/Service Name/i) as HTMLInputElement;
    const descTextarea = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
    const categorySelect = screen.getByLabelText(/Category/i) as HTMLSelectElement;
    const durationInput = screen.getByLabelText(/Duration/i) as HTMLInputElement;
    const priceInput = screen.getByLabelText(/Base Price/i) as HTMLInputElement;
    const taxRateInput = screen.getByLabelText(/Tax Rate/i) as HTMLInputElement;

    expect(nameInput.value).toBe("sdfghj");
    expect(descTextarea.value).toBe("jk");
    expect(categorySelect.value).toBe("6a6c53d9f185420dac19b1dc");
    expect(durationInput.value).toBe("30");
    expect(priceInput.value).toBe("120000");
    expect(taxRateInput.value).toBe("13");
  });
});
