export interface WarehouseDto {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  delhiveryPickupLocation: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string;
  delhiveryPickupLocation?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateWarehouseInput = Partial<CreateWarehouseInput>;
