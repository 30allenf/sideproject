import { Timestamp } from 'firebase/firestore'

export type PresenceStatus = 'online' | 'away' | 'offline'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  username: string
  avatarUrl: string
  statusMessage: string
  createdAt: Timestamp
  updatedAt: Timestamp
  // presence
  presence: PresenceStatus
  lastSeen: Timestamp | null
  invisible: boolean
  // notifications
  notificationsEnabled: boolean
  mutedRooms: string[]
  mutedDMs: string[]
  pinnedDMs: string[]
}

export interface Message {
  id: string
  roomId: string
  senderId: string
  senderName: string
  senderAvatar: string
  text: string
  html?: string
  imageUrl?: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  linkPreview?: LinkPreview
  replyTo?: ReplyRef
  reactions: Record<string, string[]>  // emoji → [uids]
  seenBy: Record<string, number>       // uid → timestamp ms
  delivered: boolean
  edited: boolean
  editedAt?: Timestamp
  unsent: boolean
  createdAt: Timestamp
  type: 'text' | 'image' | 'file' | 'system'
}

export interface ReplyRef {
  messageId: string
  senderId: string
  senderName: string
  text: string
  imageUrl?: string
  unsent?: boolean
}

export interface LinkPreview {
  url: string
  title: string
  description: string
  imageUrl: string
}

export interface Room {
  id: string
  name: string
  description: string
  iconUrl?: string
  iconEmoji?: string
  isPublic: boolean
  createdBy: string
  members: string[]
  admins: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
  lastMessage?: string
  lastMessageAt?: Timestamp
  customEmoji?: Record<string, string>  // name → url
}

export interface DMConversation {
  id: string
  participants: string[]           // [uid1, uid2]
  participantProfiles: Record<string, Pick<UserProfile, 'displayName' | 'username' | 'avatarUrl' | 'presence' | 'lastSeen'>>
  lastMessage?: string
  lastMessageAt?: Timestamp
  lastSenderId?: string
  unreadCount: Record<string, number>  // uid → count
  typing: Record<string, boolean>
}

export interface Notification {
  id: string
  recipientId: string
  type: 'dm' | 'mention' | 'reaction' | 'room_invite'
  roomId?: string
  dmId?: string
  messageId?: string
  senderId: string
  senderName: string
  senderAvatar: string
  text: string
  read: boolean
  createdAt: Timestamp
}
