import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const getTodayStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const createLeaveSchema = z
  .object({
    staffId: z.string().optional().or(z.literal("")),
    leaveType: z.string().trim().min(1, "Leave type is required"),
    startDate: z.string().regex(dateRegex, "Start date must be in YYYY-MM-DD format"),
    endDate: z.string().regex(dateRegex, "End date must be in YYYY-MM-DD format"),
    reason: z.string().trim().min(1, "Reason is required"),
  })
  .refine(
    (data) => {
      return data.startDate >= getTodayStr();
    },
    {
      message: "Start date cannot be in the past",
      path: ["startDate"],
    }
  )
  .refine(
    (data) => {
      return data.startDate <= data.endDate;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startDate + "T00:00:00");
      const end = new Date(data.endDate + "T00:00:00");
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
      const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return diff <= 365;
    },
    {
      message: "Leave duration cannot exceed 365 days",
      path: ["endDate"],
    }
  );

export type CreateLeaveFormValues = z.infer<typeof createLeaveSchema>;

export const updateLeaveSchema = z
  .object({
    leaveType: z.string().trim().min(1, "Leave type is required").optional(),
    startDate: z.string().regex(dateRegex, "Start date must be in YYYY-MM-DD format").optional(),
    endDate: z.string().regex(dateRegex, "End date must be in YYYY-MM-DD format").optional(),
    reason: z.string().trim().min(1, "Reason is required").optional(),
  })
  .refine(
    (data) => {
      if (data.startDate) {
        return data.startDate >= getTodayStr();
      }
      return true;
    },
    {
      message: "Start date cannot be in the past",
      path: ["startDate"],
    }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate + "T00:00:00");
        const end = new Date(data.endDate + "T00:00:00");
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
        const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return diff <= 365;
      }
      return true;
    },
    {
      message: "Leave duration cannot exceed 365 days",
      path: ["endDate"],
    }
  );

export type UpdateLeaveFormValues = z.infer<typeof updateLeaveSchema>;

export const approveLeaveSchema = z.object({
  reviewNote: z.string().trim().optional(),
});

export const rejectLeaveSchema = z.object({
  reviewNote: z.string().trim().min(1, "Review note is required to reject leave"),
});

export const cancelLeaveSchema = z.object({
  cancelReason: z.string().trim().min(1, "Cancellation reason is required"),
});

