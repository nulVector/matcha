import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OutboxMessage = {
  localId: string;
  connectionId: string;
  senderId: string;
  receiverId: string;
  content: string;
  status: 'pending' | 'failed';
  createdAt: number;
};

interface OutboxState {
  messages: OutboxMessage[];
  addMessage: (msg: Omit<OutboxMessage, 'status' | 'localId' | 'createdAt'>) => string;
  acknowledgeMessage: (connectionId: string, content: string) => void;
  markFailed: (localId: string) => void;
  removeMessage: (localId: string) => void;
  retryMessage: (localId: string) => void;
  clearOutbox: () => void;
}

export const useOutboxStore = create<OutboxState>()(
  persist(
    (set) => ({
      messages: [],
      
      addMessage: (msg) => {
        const localId = `temp-${crypto.randomUUID()}`;
        set((state) => ({
          messages: [
            ...state.messages,
            { ...msg, localId, status: 'pending', createdAt: Date.now() },
          ],
        }));
        return localId;
      },

      acknowledgeMessage: (connectionId, content) => {
        set((state) => {
          const index = state.messages.findIndex(
            (m) => m.connectionId === connectionId && m.content === content
          );
          if (index === -1) return state;
          const newMessages = [...state.messages];
          newMessages.splice(index, 1);
          return { messages: newMessages };
        });
      },

      markFailed: (localId) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.localId === localId ? { ...m, status: 'failed' } : m
          ),
        }));
      },

      removeMessage: (localId) => {
        set((state) => ({
          messages: state.messages.filter((m) => m.localId !== localId),
        }));
      },

      retryMessage: (localId) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.localId === localId ? { ...m, status: 'pending', createdAt: Date.now() } : m
          ),
        }));
      },
      clearOutbox: () => set({ messages: [] }),
    }),
    {
      name: 'matcha-outbox',
    }
  )
);