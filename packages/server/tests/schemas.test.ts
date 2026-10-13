import { describe, expect, it } from "vitest";
import {
  maintenanceRecordSchema,
  maintenanceRecordUpdateSchema,
} from "@/maintenance/maintenance.schema";
import {
  VEHICLE_NOTES_MAX_LENGTH,
  vehicleSchema,
  vehicleUpdateSchema,
} from "@/vehicles/vehicles.schema";

const VALID_VEHICLE = {
  make: "Peugeot",
  model: "208",
  licensePlate: "AB-123-CD",
  year: 2019,
  initialMileage: 45000,
  initialMileageDate: "2021-06-01",
  engine: "1.2 PureTech",
  oilCapacity: "3,5 L",
  oilChangeInterval: "15 000 km",
};

const VALID_RECORD = {
  date: "2026-03-15",
  mileage: 100000,
  type: "Vidange",
  details: "Huile 5W30",
};

describe("vehicleSchema", () => {
  it("accepts a complete vehicle", () => {
    expect(vehicleSchema.safeParse(VALID_VEHICLE).success).toBe(true);
  });

  it("rejects empty strings", () => {
    expect(vehicleSchema.safeParse({ ...VALID_VEHICLE, make: "" }).success).toBe(false);
  });

  it("rejects negative or fractional mileage", () => {
    expect(vehicleSchema.safeParse({ ...VALID_VEHICLE, initialMileage: -1 }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...VALID_VEHICLE, initialMileage: 1.5 }).success).toBe(false);
  });

  it("rejects an out-of-range year", () => {
    expect(vehicleSchema.safeParse({ ...VALID_VEHICLE, year: 1899 }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...VALID_VEHICLE, year: 2101 }).success).toBe(false);
  });

  it("rejects mileage sent as a string", () => {
    expect(vehicleSchema.safeParse({ ...VALID_VEHICLE, initialMileage: "123" }).success).toBe(
      false,
    );
  });

  it("treats notes as optional and trims them", () => {
    expect(vehicleSchema.parse(VALID_VEHICLE)).not.toHaveProperty("notes");
    expect(
      vehicleSchema.parse({ ...VALID_VEHICLE, notes: "  https://www.realoem.com  " }).notes,
    ).toBe("https://www.realoem.com");
  });

  it("rejects notes over the maximum length", () => {
    const notes = "x".repeat(VEHICLE_NOTES_MAX_LENGTH + 1);
    expect(vehicleSchema.safeParse({ ...VALID_VEHICLE, notes }).success).toBe(false);
  });

  it("strips unknown fields", () => {
    const parsed = vehicleSchema.parse({ ...VALID_VEHICLE, id: "injected", unknown: true });
    expect(parsed).not.toHaveProperty("id");
    expect(parsed).not.toHaveProperty("unknown");
  });
});

describe("vehicleUpdateSchema", () => {
  it("accepts a partial update", () => {
    expect(vehicleUpdateSchema.safeParse({ initialMileage: 130000 }).success).toBe(true);
    expect(vehicleUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("leaves the notes untouched when they are not sent", () => {
    expect(vehicleUpdateSchema.parse({ initialMileage: 130000 })).not.toHaveProperty("notes");
  });

  it("still validates the fields that are present", () => {
    expect(vehicleUpdateSchema.safeParse({ make: "" }).success).toBe(false);
  });
});

describe("maintenanceRecordSchema", () => {
  it("accepts a day-precision ISO date", () => {
    expect(maintenanceRecordSchema.safeParse(VALID_RECORD).success).toBe(true);
  });

  it("rejects any other date format", () => {
    for (const date of ["15/03/2026", "2026-03-15T10:00:00Z", "2026-13-01", "", "tomorrow"]) {
      expect(maintenanceRecordSchema.safeParse({ ...VALID_RECORD, date }).success, date).toBe(
        false,
      );
    }
  });

  it("requires non-empty details", () => {
    expect(maintenanceRecordSchema.safeParse({ ...VALID_RECORD, details: "" }).success).toBe(false);
  });

  it("accepts an optional cost in integer cents", () => {
    for (const costCents of [undefined, null, 0, 8990]) {
      expect(maintenanceRecordSchema.safeParse({ ...VALID_RECORD, costCents }).success).toBe(true);
    }
  });

  it("rejects a negative or fractional cost", () => {
    for (const costCents of [-1, 89.9, "8990"]) {
      expect(maintenanceRecordSchema.safeParse({ ...VALID_RECORD, costCents }).success).toBe(false);
    }
  });

  it("allows a partial update without a date", () => {
    expect(maintenanceRecordUpdateSchema.safeParse({ mileage: 5 }).success).toBe(true);
  });
});
