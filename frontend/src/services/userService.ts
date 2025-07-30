import { api } from './api'
import { UserProfile } from '../types/user'

export const userService = {
  // Get current user profile
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get<UserProfile>('/profiles')
    return response.data
  },

  // Create user profile
  createProfile: async (profile: UserProfile): Promise<UserProfile> => {
    console.log('userService.createProfile - sending to backend:', JSON.stringify(profile, null, 2))
    const response = await api.post<UserProfile>('/profiles', profile)
    return response.data
  },

  // Update user profile
  updateProfile: async (profile: UserProfile): Promise<UserProfile> => {
    console.log('userService.updateProfile - sending to backend:', JSON.stringify(profile, null, 2))
    const response = await api.put<UserProfile>('/profiles', profile)
    return response.data
  },

  // Delete user profile
  deleteProfile: async (): Promise<void> => {
    await api.delete('/profiles')
  }
}