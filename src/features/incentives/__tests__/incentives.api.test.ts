import { afterEach, describe, expect, it, vi } from "vitest";

const apiClientMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api/axios", () => ({
  apiClient: apiClientMocks,
}));

import { incentivesApi } from "../api/incentives.api";

describe("incentives API branch contracts", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requests summary metrics for the selected branch", async () => {
    apiClientMocks.get.mockResolvedValue({
      data: { data: { netAccruedPaise: 100 } },
    });

    await incentivesApi.getSummary("branch-1");

    expect(apiClientMocks.get).toHaveBeenCalledWith(
      "/incentives/summary",
      { params: { branchId: "branch-1" } },
    );
  });

  it("sends the active branch scope for attendance compute and finalization", async () => {
    apiClientMocks.post
      .mockResolvedValueOnce({ data: { data: { id: "evaluation-1" } } })
      .mockResolvedValueOnce({ data: { data: { evaluation: { id: "evaluation-1" } } } });

    await incentivesApi.computeAttendanceEvaluation({
      staffId: "staff-1",
      schemeId: "scheme-1",
      monthYear: "2026-11",
    });
    await incentivesApi.finalizeAttendanceEvaluation("evaluation-1");

    expect(apiClientMocks.post).toHaveBeenNthCalledWith(
      1,
      "/incentives/attendance-evaluations/compute",
      { staffId: "staff-1", schemeId: "scheme-1", monthYear: "2026-11" },
      { branchScope: "current" },
    );
    expect(apiClientMocks.post).toHaveBeenNthCalledWith(
      2,
      "/incentives/attendance-evaluations/evaluation-1/finalize",
      undefined,
      { branchScope: "current" },
    );
  });
});
