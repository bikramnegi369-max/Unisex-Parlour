/**
 * Helper to calculate late completion delay (in minutes) taking into account
 * calendar date boundaries (cross-midnight appointments) and the specific branch timezone.
 *
 * It projects both the scheduled end instant and the actual completedAt ISO instant
 * into epoch milliseconds, calculating the exact signed difference in minutes:
 * (completedEpoch - scheduledEndEpoch) / 60000.
 */
export function calculateLateDelayMins({
  date,
  endTime,
  completedAt,
  branchTimezone = "Asia/Kolkata",
}: {
  date?: string; // YYYY-MM-DD
  endTime?: string; // HH:mm
  completedAt?: string | null; // ISO string
  branchTimezone?: string;
}): {
  lateDelayMins: number | null;
  actualCompletedTimeStr: string | null;
} {
  if (!completedAt || !endTime) {
    return { lateDelayMins: null, actualCompletedTimeStr: null };
  }

  try {
    const compDate = new Date(completedAt);
    if (isNaN(compDate.getTime())) {
      return { lateDelayMins: null, actualCompletedTimeStr: null };
    }

    // Format actual completion time in branch timezone
    const compParts = new Intl.DateTimeFormat("en-US", {
      timeZone: branchTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      hourCycle: "h23",
    }).formatToParts(compDate);

    const compHStr = compParts.find((p) => p.type === "hour")?.value || "00";
    const compMStr = compParts.find((p) => p.type === "minute")?.value || "00";
    const actualCompletedTimeStr = `${compHStr}:${compMStr}`;

    // If scheduled date is provided, build an ISO/Date reference in the branch timezone
    if (date) {
      // Create scheduled end date-time string in branch timezone
      // Parse scheduled date: YYYY-MM-DD
      const [year, month, day] = date.split("-").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);

      if (
        !isNaN(year) &&
        !isNaN(month) &&
        !isNaN(day) &&
        !isNaN(endH) &&
        !isNaN(endM)
      ) {
        // Construct standard ISO string representation for scheduled end
        // To find the exact epoch for (date + endTime) in `branchTimezone`:
        // We find the UTC offset of branchTimezone on that day
        const tzDate = new Date(Date.UTC(year, month - 1, day, endH, endM, 0));
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: branchTimezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hourCycle: "h23",
        });

        const parts = formatter.formatToParts(tzDate);
        const tzH = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
        const tzM = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
        const tzDay = parseInt(parts.find((p) => p.type === "day")?.value || "0", 10);

        // Calculate offset difference between target local clock and UTC trial clock
        const diffMinutes =
          (tzDay - day) * 1440 + (tzH - endH) * 60 + (tzM - endM);
        const scheduledEndEpoch = tzDate.getTime() - diffMinutes * 60000;

        const delayMs = compDate.getTime() - scheduledEndEpoch;
        const delayMins = Math.round(delayMs / 60000);

        return {
          lateDelayMins: delayMins > 0 ? delayMins : null,
          actualCompletedTimeStr,
        };
      }
    }

    // Fallback: If no date provided or date parsing failed, compare clock times on same day
    // with cross-midnight adjustment
    const compH = parseInt(compHStr, 10);
    const compM = parseInt(compMStr, 10);
    const actualEndMin = compH * 60 + compM;
    const [endH, endM] = endTime.split(":").map(Number);
    if (!isNaN(endH) && !isNaN(endM)) {
      const schedEndMin = endH * 60 + endM;
      // If completed on next day or midnight crossed:
      let diff = actualEndMin - schedEndMin;
      if (diff < -720) {
        // e.g. schedEnd 23:45 (1425), comp 00:15 (15) -> diff = 15 - 1425 = -1410
        // -1410 + 1440 = 30 minutes late
        diff += 1440;
      }
      return {
        lateDelayMins: diff > 0 ? diff : null,
        actualCompletedTimeStr,
      };
    }

    return {
      lateDelayMins: null,
      actualCompletedTimeStr,
    };
  } catch {
    return { lateDelayMins: null, actualCompletedTimeStr: null };
  }
}
