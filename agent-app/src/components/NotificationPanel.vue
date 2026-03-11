<template>
  <f7-popup v-model:opened="isOpened" @popup:closed="onClose">
    <f7-page>
      <f7-navbar title="Notificaciones">
        <f7-nav-right>
          <f7-link popup-close>Cerrar</f7-link>
        </f7-nav-right>
      </f7-navbar>

      <f7-list>
        <f7-list-item title="Sin leer" group-title></f7-list-item>
        <f7-list-item
          v-for="notif in unreadNotifications"
          :key="notif.id"
          :title="notif.message"
          :subtitle="notif.type === 'contact_request' ? '🟡 Intentando contactar' : '🟢 Conectado'"
          class="bg-color-yellow-light"
          @click="handleClick(notif)"
        ></f7-list-item>

        <f7-list-item title="Leídas" group-title></f7-list-item>
      </f7-list>
    </f7-page>
  </f7-popup>
</template>

<script>
import { useSessionsStore } from '../store/sessions.js';
import { AgentFirebaseService } from '../services/firebase.js';
import { f7 } from 'framework7-vue';

export default {
  props: {
    opened: Boolean
  },
  emits: ['update:opened'],
  computed: {
    isOpened: {
      get() { return this.opened; },
      set(val) { this.$emit('update:opened', val); }
    },
    unreadNotifications() {
      const store = useSessionsStore();
      return store.notifications;
    }
  },
  methods: {
    onClose() {
      // Mark all visible notifications as read
      this.unreadNotifications.forEach(n => {
          AgentFirebaseService.markNotificationRead(n.id);
      });
    },
    async handleClick(notif) {
      const store = useSessionsStore();
      const session = store.sessions.find(s => s.id === notif.sessionId);

      if (!session) return; // Session might be deleted

      // 1.1 Access Logic
      const myId = 'me'; // TODO: Get from Auth

      if (session.agentId && session.agentId !== myId) {
         f7.dialog.confirm(`Está ${session.agentId} conectado. ¿Desea visualizar?`, () => {
             f7.views.main.router.navigate(`/chat/${session.id}`); // Readonly logic to be handled by ChatPage
             this.isOpened = false;
         });
      } else if (session.agentId === myId) {
          f7.views.main.router.navigate(`/chat/${session.id}`);
          this.isOpened = false;
      } else if (session.status === 'inactive') {
          f7.dialog.confirm('La sesión está inactiva. ¿Desea entrar al chat?', () => {
              f7.views.main.router.navigate(`/chat/${session.id}`);
              this.isOpened = false;
          });
      } else if (session.status === 'waiting') {
          f7.dialog.confirm('¿Desea atender esta consulta?', async () => {
              // Take Session
              await AgentFirebaseService.takeSession(session.id, myId, 'Agente');
              f7.views.main.router.navigate(`/chat/${session.id}`);
              this.isOpened = false;
          });
      } else if (session.status === 'bot') {
          f7.dialog.confirm('Sesión activa con bot. ¿Desea visualizar?', () => {
              f7.views.main.router.navigate(`/chat/${session.id}`);
              this.isOpened = false;
          });
      }
    }
  }
};
</script>
