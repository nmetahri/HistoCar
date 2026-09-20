const API_URL = import.meta.env["VITE_API_URL"] as string;

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
  year: number;
  currentMileage: number;
  engine: string;
  oilCapacity: string;
  oilChangeInterval: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  date: string;
  mileage: number;
  type: string;
  details: string;
}

export type VehicleWithMaintenance = Vehicle & { maintenanceRecords: MaintenanceRecord[] };

export type VehicleFormValues = Omit<Vehicle, "id">;
export type MaintenanceRecordFormValues = Omit<MaintenanceRecord, "id" | "vehicleId">;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const UNAUTHORIZED = 401;

let onUnauthorized: (() => void) | null = null;

// Permet à AuthProvider de vider la session locale quand le cookie expire en
// cours de navigation, plutôt que de laisser l'écran vide sur une erreur.
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    if (response.status === UNAUTHORIZED && !path.startsWith("/auth/")) {
      onUnauthorized?.();
    }
    throw new ApiError(body.message ?? `Erreur ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ username: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  register: (username: string, password: string, inviteCode: string) =>
    request<{ username: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, inviteCode }),
    }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<{ username: string }>("/auth/me"),

  listVehicles: () => request<Vehicle[]>("/vehicles"),
  getVehicle: (id: string) => request<VehicleWithMaintenance>(`/vehicles/${id}`),
  createVehicle: (values: VehicleFormValues) =>
    request<Vehicle>("/vehicles", { method: "POST", body: JSON.stringify(values) }),
  updateVehicle: (id: string, values: Partial<VehicleFormValues>) =>
    request<Vehicle>(`/vehicles/${id}`, { method: "PUT", body: JSON.stringify(values) }),
  deleteVehicle: (id: string) => request<void>(`/vehicles/${id}`, { method: "DELETE" }),

  createMaintenanceRecord: (vehicleId: string, values: MaintenanceRecordFormValues) =>
    request<MaintenanceRecord>(`/vehicles/${vehicleId}/maintenance`, {
      method: "POST",
      body: JSON.stringify(values),
    }),
  updateMaintenanceRecord: (
    vehicleId: string,
    id: string,
    values: Partial<MaintenanceRecordFormValues>,
  ) =>
    request<MaintenanceRecord>(`/vehicles/${vehicleId}/maintenance/${id}`, {
      method: "PUT",
      body: JSON.stringify(values),
    }),
  deleteMaintenanceRecord: (vehicleId: string, id: string) =>
    request<void>(`/vehicles/${vehicleId}/maintenance/${id}`, { method: "DELETE" }),

  reportPdfUrl: (vehicleId: string) => `${API_URL}/vehicles/${vehicleId}/report.pdf`,
};
