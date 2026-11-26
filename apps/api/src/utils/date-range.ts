export type DatePeriod =
  "today" | "yesterday" | "last_7_days" | "last_30_days" | "all";

interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

export const getDateRange = (period: DatePeriod): DateRange => {
  if (period === "all") {
    return {};
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startDate = new Date(today);
  let endDate = tomorrow;

  switch (period) {
    case "yesterday":
      startDate.setDate(startDate.getDate() - 1);
      endDate = today;
      break;

    case "last_7_days":
      startDate.setDate(startDate.getDate() - 6);
      break;

    case "last_30_days":
      startDate.setDate(startDate.getDate() - 29);
      break;
  }

  return { startDate, endDate };
};
