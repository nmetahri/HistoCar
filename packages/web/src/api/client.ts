import { StatusCodes } from "http-status-codes";

const API_URL = import.meta.env["VITE_API_URL"] as string;

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
  year: number;
  initialMileage: number;
  initialMileageDate: string;
  engine: string;
  oilCapacity: string;
  oilChangeInterval: string;
  notes: string;
}

export interface Attachment {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  date: string;
  mileage: number;
  type: string;
  details: string;
  costCents: number | null;
  attachments: Attachment[];
}

export type VehicleWithMaintenance = Vehicle & { maintenanceRecords: MaintenanceRecord[] };

export type VehicleFormValues = Omit<Vehicle, "id">;
export type MaintenanceRecordFormValues = Omit<
  MaintenanceRecord,
  "id" | "vehicleId" | "attachments"
>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;

// Permet à AuthProvider de vider la session locale quand le cookie expire en
// cours de navigation, plutôt que de laisser l'écran vide sur une erreur.
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

// Un FormData doit partir sans Content-Type explicite : le navigateur y
// ajoute la boundary multipart.
function headersFor(options: RequestInit): HeadersInit | undefined {
  return options.body instanceof FormData
    ? options.headers
    : { "Content-Type": "application/json", ...options.headers };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: headersFor(options),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    if (response.status === StatusCodes.UNAUTHORIZED && !path.startsWith("/auth/")) {
      onUnauthorized?.();
    }
    throw new ApiError(body.message ?? `Erreur ${response.status}`, response.status);
  }

  if (response.status === StatusCodes.NO_CONTENT) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

const ATTACHMENT_FIELD_NAME = "files";

function attachmentsPath(vehicleId: string, recordId: string): string {
  return `/vehicles/${vehicleId}/maintenance/${recordId}/attachments`;
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
  listArchivedVehicles: () => request<Vehicle[]>("/vehicles/archived"),
  restoreVehicle: (id: string) => request<Vehicle>(`/vehicles/${id}/restore`, { method: "POST" }),

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

  uploadAttachments: (vehicleId: string, recordId: string, files: readonly File[]) => {
    const body = new FormData();
    for (const file of files) {
      body.append(ATTACHMENT_FIELD_NAME, file);
    }
    return request<Attachment[]>(attachmentsPath(vehicleId, recordId), { method: "POST", body });
  },
  deleteAttachment: (vehicleId: string, recordId: string, id: string) =>
    request<void>(`${attachmentsPath(vehicleId, recordId)}/${id}`, { method: "DELETE" }),
  attachmentUrl: (vehicleId: string, recordId: string, id: string) =>
    `${API_URL}${attachmentsPath(vehicleId, recordId)}/${id}`,

  reportPdfUrl: (vehicleId: string) => `${API_URL}/vehicles/${vehicleId}/report.pdf`,
  attachmentsPdfUrl: (vehicleId: string) => `${API_URL}/vehicles/${vehicleId}/attachments.pdf`,
};
