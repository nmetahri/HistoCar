import { maintenanceRecordFixture, vehicleFixture } from "@tests/fixtures";
import { describe, expect, it } from "vitest";
import { buildMaintenanceReport, escapeHtml, formatDate, formatMileage } from "@/report/report";

describe("formatDate", () => {
  it("formats as dd/mm/yyyy", () => {
    expect(formatDate(new Date("2026-03-05T00:00:00Z"))).toBe("05/03/2026");
  });

  it("reads UTC parts so the day never shifts with the local timezone", () => {
    expect(formatDate(new Date("2026-01-01T00:00:00Z"))).toBe("01/01/2026");
    expect(formatDate(new Date("2026-12-31T23:59:00Z"))).toBe("31/12/2026");
  });
});

describe("formatMileage", () => {
  it("groups thousands with a space", () => {
    expect(formatMileage(123456)).toBe("123 456 km");
    expect(formatMileage(1234567)).toBe("1 234 567 km");
  });

  it("leaves small numbers untouched", () => {
    expect(formatMileage(0)).toBe("0 km");
    expect(formatMileage(999)).toBe("999 km");
  });

  it("truncates decimals", () => {
    expect(formatMileage(1500.9)).toBe("1 500 km");
  });
});

describe("escapeHtml", () => {
  it("escapes the five dangerous characters", () => {
    expect(escapeHtml(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&#39;");
  });

  it("accepts numbers", () => {
    expect(escapeHtml(2019)).toBe("2019");
  });
});

describe("buildMaintenanceReport", () => {
  it("renders the vehicle details", () => {
    const html = buildMaintenanceReport(vehicleFixture(), []);
    expect(html).toContain("Peugeot");
    expect(html).toContain("AB-123-CD");
    expect(html).toContain("123 456 km");
    expect(html).toContain("1.2 PureTech");
  });

  it("sorts records from newest to oldest", () => {
    const html = buildMaintenanceReport(vehicleFixture(), [
      maintenanceRecordFixture({ id: "a", date: new Date("2024-01-10T00:00:00Z"), type: "Oldest" }),
      maintenanceRecordFixture({ id: "b", date: new Date("2026-06-01T00:00:00Z"), type: "Newest" }),
      maintenanceRecordFixture({ id: "c", date: new Date("2025-03-03T00:00:00Z"), type: "Middle" }),
    ]);

    expect(html.indexOf("Newest")).toBeLessThan(html.indexOf("Middle"));
    expect(html.indexOf("Middle")).toBeLessThan(html.indexOf("Oldest"));
  });

  it("does not mutate the records it receives", () => {
    const records = [
      maintenanceRecordFixture({ id: "a", date: new Date("2024-01-10T00:00:00Z") }),
      maintenanceRecordFixture({ id: "b", date: new Date("2026-06-01T00:00:00Z") }),
    ];
    buildMaintenanceReport(vehicleFixture(), records);
    expect(records.map((record) => record.id)).toEqual(["a", "b"]);
  });

  it("escapes user-supplied content", () => {
    const html = buildMaintenanceReport(vehicleFixture({ model: 'Clio "RS" <3' }), [
      maintenanceRecordFixture({ details: "<script>alert(1)</script>" }),
    ]);

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("Clio &quot;RS&quot; &lt;3");
  });

  it("produces a complete document even with no records", () => {
    const html = buildMaintenanceReport(vehicleFixture(), []);
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("</html>");
    expect(html).toContain("<tbody>");
  });
});
