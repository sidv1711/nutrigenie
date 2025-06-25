import { api } from './api';
import { NearbyStoresResponse } from '../types/store';

export const storeService = {
  /**
   * Fetch grocery stores within ~5 km of the given ZIP code.
   * Relies on the auth token interceptor set up in api.ts.
   */
  fetchNearbyStores: async (zip: string): Promise<NearbyStoresResponse> => {
    const response = await api.get<NearbyStoresResponse>('/stores/nearby', {
      params: { zip },
    });
    return response.data;
  },
}; 