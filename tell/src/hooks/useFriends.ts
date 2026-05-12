'use client'

import type { UserProfile, FriendRequest, PresenceRecord } from '@/types'

// Friends/social features removed — bot games only
export function useFriends(_profile: UserProfile | null) {
  return {
    friends: [] as UserProfile[],
    presence: {} as Record<string, PresenceRecord>,
    pendingRequests: [] as FriendRequest[],
    loading: false,
    sendRequest: async (_toUid: string) => {},
    respond: async (_request: FriendRequest, _accept: boolean) => {},
    search: async (_term: string): Promise<UserProfile[]> => [],
  }
}
