import {
  addDaysIST,
  calendarDaysApartIST,
  compareDateIST,
  dateFromParts,
  endOfDayIST,
  todayIST,
  toDateOnlyIST,
} from "@/domains/kernel/date-utils";

describe("date-utils IST", () => {
  it("toDateOnlyIST parses YYYY-MM-DD as UTC midnight", () => {
    const d = toDateOnlyIST("2026-07-13");
    expect(d.toISOString()).toBe("2026-07-13T00:00:00.000Z");
  });

  it("addDaysIST rolls month boundary", () => {
    const start = dateFromParts(2026, 7, 31);
    const next = addDaysIST(start, 1);
    expect(next.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("endOfDayIST covers full IST calendar day", () => {
    const end = endOfDayIST("2026-07-13");
    expect(end.getUTCHours()).toBe(23);
    expect(end.getUTCMinutes()).toBe(59);
  });

  it("calendarDaysApartIST returns whole days between dates", () => {
    const a = dateFromParts(2026, 7, 1);
    const b = dateFromParts(2026, 7, 8);
    expect(calendarDaysApartIST(a, b)).toBe(7);
  });

  it("compareDateIST orders date-only values", () => {
    const earlier = dateFromParts(2026, 6, 1);
    const later = dateFromParts(2026, 7, 1);
    expect(compareDateIST(earlier, later)).toBe(-1);
    expect(compareDateIST(later, earlier)).toBe(1);
  });

  it("todayIST returns date-only UTC midnight", () => {
    const t = todayIST();
    expect(t.getUTCHours()).toBe(0);
    expect(t.getUTCMinutes()).toBe(0);
  });
});
