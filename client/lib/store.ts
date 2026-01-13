import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  phone: string;
  bio: string;
  avatar: string;
  is_online?: boolean;
  last_seen?: string;
}

interface Message {
  id?: string;
  message_id?: string;
  chat_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type?: 'text' | 'image' | 'file' | 'audio' | 'video';
  status?: 'sent' | 'delivered' | 'read';
  reply_to?: string;
  reply_text?: string;
  media_url?: string;
  file_name?: string;
  is_group?: boolean;
  is_deleted?: boolean;
  created_at: string;
}

interface Contact {
  id: string;
  owner_id: string;
  contact_id: string;
  display_name: string;
  phone: string;
  user: User;
}

interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string;
  creator_id: string;
  admins: string[];
  members: string[];
  created_at: string;
}

interface TypingState {
  [chatId: string]: {
    userId: string;
    username: string;
    isTyping: boolean;
  };
}

interface OnlineStatus {
  [userId: string]: {
    isOnline: boolean;
    lastSeen: string;
  };
}

interface AppState {
  user: User | null;
  token: string | null;
  messages: Message[];
  contacts: Contact[];
  groups: Group[];
  activeChat: string | null;
  activeChatUser: User | null;
  activeGroup: Group | null;
  isGroupChat: boolean;
  typing: TypingState;
  onlineStatus: OnlineStatus;
  replyingTo: Message | null;
  
  // Actions
  setUser: (user: User, token: string) => void;
  updateProfile: (updates: Partial<User>) => void;
  setMessages: (messages: Message[]) => void;
  addMessages: (messages: Message[]) => void;
  addMessage: (msg: Message) => void;
  updateMessageStatus: (messageIds: string | string[], status: 'delivered' | 'read') => void;
  deleteMessage: (messageId: string, deleteForEveryone: boolean) => void;
  setActiveChat: (chatId: string, chatUser: User | null) => void;
  setActiveGroup: (group: Group | null) => void;
  setContacts: (contacts: Contact[]) => void;
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  setTyping: (chatId: string, userId: string, username: string, isTyping: boolean) => void;
  setTypingUser: (userId: string, isTyping: boolean) => void;
  setOnlineStatus: (userId: string, isOnline: boolean, lastSeen: string) => void;
  setOnlineUser: (userId: string, isOnline: boolean) => void;
  setReplyingTo: (message: Message | null) => void;
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      messages: [],
      contacts: [],
      groups: [],
      activeChat: null,
      activeChatUser: null,
      activeGroup: null,
      isGroupChat: false,
      typing: {},
      onlineStatus: {},
      replyingTo: null,

      setUser: (user, token) => set({ user, token }),
      
      updateProfile: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),

      setMessages: (messages) => set({ messages }),

      addMessages: (newMessages) => set((state) => {
        const existingIds = new Set(
          state.messages.map(m => m.message_id || m.id || `${m.sender_id}-${m.created_at}`)
        );
        const uniqueNew = newMessages.filter(msg => {
          const msgId = msg.message_id || msg.id || `${msg.sender_id}-${msg.created_at}`;
          return !existingIds.has(msgId);
        });
        if (uniqueNew.length === 0) return state;
        return { messages: [...state.messages, ...uniqueNew] };
      }),

      addMessage: (msg) => set((state) => {
        const msgId = msg.message_id || msg.id || `${msg.sender_id}-${msg.created_at}`;
        const exists = state.messages.some(
          m => (m.message_id || m.id || `${m.sender_id}-${m.created_at}`) === msgId
        );
        if (exists) return state;
        return { messages: [...state.messages, msg] };
      }),

      updateMessageStatus: (messageIds, status) => set((state) => {
        const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
        return {
          messages: state.messages.map(m =>
            ids.includes(m.message_id || m.id || '') ? { ...m, status } : m
          )
        };
      }),

      deleteMessage: (messageId, deleteForEveryone) => set((state) => ({
        messages: deleteForEveryone
          ? state.messages.map(m =>
              (m.message_id === messageId || m.id === messageId)
                ? { ...m, is_deleted: true, content: 'This message was deleted' }
                : m
            )
          : state.messages.filter(m => m.message_id !== messageId && m.id !== messageId)
      })),

      setActiveChat: (chatId, chatUser) => set({
        activeChat: chatId,
        activeChatUser: chatUser,
        activeGroup: null,
        isGroupChat: false,
        replyingTo: null
      }),

      setActiveGroup: (group) => set({
        activeGroup: group,
        activeChat: group?.id || null,
        activeChatUser: null,
        isGroupChat: true,
        replyingTo: null
      }),

      setContacts: (contacts) => set({ contacts }),
      
      setGroups: (groups) => set({ groups }),
      
      addGroup: (group) => set((state) => ({
        groups: [...state.groups, group]
      })),

      setTyping: (chatId, userId, username, isTyping) => set((state) => ({
        typing: {
          ...state.typing,
          [chatId]: { userId, username, isTyping }
        }
      })),

      setTypingUser: (userId, isTyping) => set((state) => ({
        typing: {
          ...state.typing,
          [userId]: { userId, username: '', isTyping }
        }
      })),

      setOnlineStatus: (userId, isOnline, lastSeen) => set((state) => ({
        onlineStatus: {
          ...state.onlineStatus,
          [userId]: { isOnline, lastSeen }
        }
      })),

      setOnlineUser: (userId, isOnline) => set((state) => ({
        onlineStatus: {
          ...state.onlineStatus,
          [userId]: { isOnline, lastSeen: isOnline ? '' : new Date().toISOString() }
        }
      })),

      setReplyingTo: (message) => set({ replyingTo: message }),

      logout: () => set({
        user: null,
        token: null,
        messages: [],
        contacts: [],
        groups: [],
        activeChat: null,
        activeChatUser: null,
        activeGroup: null,
        isGroupChat: false,
        typing: {},
        onlineStatus: {},
        replyingTo: null
      }),
    }),
    {
      name: 'chatterbox-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
