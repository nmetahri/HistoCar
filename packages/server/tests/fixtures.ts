import type { MaintenanceRecord, User, Vehicle } from "@prisma/client";

export const TEST_PASSWORD = "test-password";
export const TEST_USER_ID = "usr_1";

export function userFixture(overrides: Partial<User> = {}): User {
  return {
    id: TEST_USER_ID,
    username: "tester",
    // bcrypt de TEST_PASSWORD
    passwordHash: "$2b$10$dZfws/kXFs9dtg58Q6PZreOXJkjRHN42UqyjmDJM.S5y6q/Cji0pq",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

export function vehicleFixture(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "veh_1",
    userId: TEST_USER_ID,
    make: "Peugeot",
    model: "208",
    licensePlate: "AB-123-CD",
    year: 2019,
    currentMileage: 123456,
    engine: "1.2 PureTech",
    oilCapacity: "3,5 L",
    oilChangeInterval: "15 000 km",
    active: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

export function maintenanceRecordFixture(
  overrides: Partial<MaintenanceRecord> = {},
): MaintenanceRecord {
  return {
    id: "rec_1",
    vehicleId: "veh_1",
    date: new Date("2026-03-15T00:00:00Z"),
    mileage: 100000,
    type: "Vidange",
    details: "Huile 5W30 + filtre",
    createdAt: new Date("2026-03-15T00:00:00Z"),
    ...overrides,
  };
}
