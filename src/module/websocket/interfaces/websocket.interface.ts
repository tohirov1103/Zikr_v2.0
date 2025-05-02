export interface NotificationPayload {
  id: string;
  type: 'invitation' | 'notification';
  senderId: string;
  senderName: string;
  groupId?: string;
  groupName?: string;
  time: Date;
  isRead: boolean;
}

export interface UserConnection {
  socketId: string;
  lastActive: Date;
  groups: Set<string>;
  isAuthenticated: boolean;
}

export interface WebSocketError {
  message: string;
  error?: string;
  code?: string;
  timestamp: Date;
}

export interface GroupEventPayload {
  groupId: string;
  groupName?: string;
  userId: string;
  userName?: string;
  timestamp: Date;
}

export interface PoraEventPayload {
  bookingId: string;
  poraId: string;
  poraName: string;
  groupId: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface ZikrEventPayload {
  groupId: string;
  zikrId: string;
  zikrName: string;
  userId: string;
  userName: string;
  count: number;
  totalCount: number;
  progress: string;
  goalReached: boolean;
  timestamp: Date;
} 