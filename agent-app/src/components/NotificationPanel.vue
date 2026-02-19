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
        <!-- Mock read notifications or load from store -->
      </f7-list>
    </f7-page>
  </f7-popup>
</template>

<script>
import { useSessionsStore } from '../store/sessions.js';
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
      // Mark as read logic would go here
      console.log("Panel closed, marking as read...");
    },
    handleClick(notif) {
      const store = useSessionsStore();
      const session = store.sessions.find(s => s.id === notif.sessionId);
      if (!session) return;

      // Logic from 1.1
      if (session.agentId && session.agentId !== 'me') { // 'me' should be real UID
         f7.dialog.confirm(`Está ${session.agentId} conectado. ¿Desea visualizar?`, () => {
             // Go readonly
             f7.views.main.router.navigate(`/chat/${session.id}?readonly=true`);
             this.isOpened = false;
         });
      } else if (session.status === 'waiting') {
          f7.dialog.confirm('¿Desea atender esta consulta?', () => {
              // Take session logic
              f7.views.main.router.navigate(`/chat/${session.id}`);
              this.isOpened = false;
          });
      }
      // ... handle other cases
    }
  }
};
</script>
