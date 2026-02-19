import { defineStore } from 'pinia';
import { getFirestore, collection, query, onSnapshot, where } from 'firebase/firestore';

export const useSessionsStore = defineStore('sessions', {
  state: () => ({
    sessions: [],
    notifications: [],
    loading: false
  }),
  actions: {
    initListener() {
      const db = getFirestore();
      // Listen to all sessions (simplified)
      const q = query(collection(db, "sessions"));

      onSnapshot(q, (snapshot) => {
        this.sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      });

      // Listen to notifications
      const qn = query(collection(db, "notifications"), where("status", "==", "unread"));
      onSnapshot(qn, (snapshot) => {
        this.notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      });
    }
  },
  getters: {
    activeSessions: (state) => state.sessions.filter(s => s.status === 'active'),
    waitingSessions: (state) => state.sessions.filter(s => s.status === 'waiting'),
    botSessions: (state) => state.sessions.filter(s => s.status === 'bot'),
    inactiveSessions: (state) => state.sessions.filter(s => s.status === 'inactive'),
    unreadNotificationsCount: (state) => state.notifications.length
  }
});
