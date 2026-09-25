import { maintenanceRecordFixture, vehicleFixture } from "@tests/fixtures";
import { describe, expect, it } from "vitest";
import { buildMaintenancePdf } from "@/report/pdf/builder";
import { distributeColumnWidths } from "@/report/pdf/table";
import {
  formatCost,
  formatDate,
  formatMileage,
  sanitizeWinAnsi,
  toReportModel,
} from "@/report/report.data";
import { buildReportFileName } from "@/report/report.routes";

const CURRENT_MILEAGE = 123456;

describe("formatDate", () => {
  it("renders day/month/year in UTC", () => {
    expect(formatDate(new Date("2026-03-05T23:30:00Z"))).toBe("05/03/2026");
  });
});

describe("formatMileage", () => {
  it("groups thousands and appends the unit", () => {
    expect(formatMileage(123456)).toBe("123 456 km");
    expect(formatMileage(0)).toBe("0 km");
  });
});

describe("formatCost", () => {
  it("renders cents as euros with French separators", () => {
    expect(formatCost(123450)).toBe("1 234,50 €");
    expect(formatCost(5)).toBe("0,05 €");
    expect(formatCost(0)).toBe("0,00 €");
  });
});

describe("sanitizeWinAnsi", () => {
  it("keeps the characters French text needs", () => {
    expect(sanitizeWinAnsi("Révision cœur — 120 € « ok »")).toBe("Révision cœur — 120 € « ok »");
  });

  it("replaces what Helvetica cannot encode", () => {
    expect(sanitizeWinAnsi("courroie 🚗 ok")).toBe("courroie ? ok");
  });
});

describe("toReportModel", () => {
  it("sorts records from newest to oldest without mutating the input", () => {
    const records = [
      maintenanceRecordFixture({ id: "old", date: new Date("2024-01-01T00:00:00Z") }),
      maintenanceRecordFixture({ id: "recent", date: new Date("2026-01-01T00:00:00Z") }),
    ];

    const model = toReportModel(vehicleFixture(), records, CURRENT_MILEAGE);

    expect(model.rows.map((row) => row[0])).toEqual(["01/01/2026", "01/01/2024"]);
    expect(records[0]?.id).toBe("old");
  });

  it("fills the cost column and totals the known costs", () => {
    const model = toReportModel(
      vehicleFixture(),
      [
        maintenanceRecordFixture({ id: "a", costCents: 8990 }),
        maintenanceRecordFixture({ id: "b", costCents: null }),
        maintenanceRecordFixture({ id: "c", costCents: 120000 }),
      ],
      CURRENT_MILEAGE,
    );

    expect(model.rows.map((row) => row[4])).toEqual(["89,90 €", "", "1 200,00 €"]);
    expect(model.totalCost).toBe("1 289,90 €");
  });

  it("omits the total when no cost is known", () => {
    expect(
      toReportModel(vehicleFixture(), [maintenanceRecordFixture()], CURRENT_MILEAGE).totalCost,
    ).toBeNull();
  });

  it("describes the vehicle and handles an empty history", () => {
    const model = toReportModel(vehicleFixture(), [], CURRENT_MILEAGE);

    expect(model.rows).toEqual([]);
    expect(model.title).toContain("Peugeot 208");
    expect(model.fields).toContainEqual({ label: "Immatriculation", value: "AB-123-CD" });
    expect(model.fields).toContainEqual({
      label: "Kilométrage initial",
      value: "45 000 km au 01/06/2021",
    });
    expect(model.fields).toContainEqual({ label: "Kilométrage actuel", value: "123 456 km" });
  });
});

describe("distributeColumnWidths", () => {
  it("spreads the full width across the columns", () => {
    const widths = distributeColumnWidths(500, [0.12, 0.14, 0.18, 0.44, 0.12]);

    expect(widths).toHaveLength(5);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBe(500);
  });
});

describe("buildReportFileName", () => {
  it("reduces the licence plate to a safe ASCII slug", () => {
    expect(buildReportFileName("AB-123-CD")).toBe("historique-entretien-ab-123-cd.pdf");
    expect(buildReportFileName('x"; rm -rf /')).toBe("historique-entretien-x-rm-rf.pdf");
    expect(buildReportFileName("🚗")).toBe("historique-entretien-vehicule.pdf");
  });
});

describe("buildMaintenancePdf", () => {
  it("produces a PDF document", async () => {
    const pdf = await buildMaintenancePdf(
      toReportModel(vehicleFixture(), [maintenanceRecordFixture()], CURRENT_MILEAGE),
    );

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.byteLength).toBeGreaterThan(500);
  });

  it("paginates a long history", async () => {
    const records = Array.from({ length: 120 }, (_, index) =>
      maintenanceRecordFixture({
        id: `rec_${index}`,
        details: `Intervention ${index} avec un descriptif suffisamment long pour occuper la colonne`,
      }),
    );

    const pdf = await buildMaintenancePdf(
      toReportModel(vehicleFixture(), records, CURRENT_MILEAGE),
    );

    const pageCount = Number(/\/Count (\d+)/.exec(pdf.toString("latin1"))?.[1]);
    expect(pageCount).toBeGreaterThan(1);
  });
});
