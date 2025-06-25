export interface StoreSummary {
  place_id: string;
  name: string;
  distance_km: number;
}

export interface NearbyStoresResponse {
  stores: StoreSummary[];
} 