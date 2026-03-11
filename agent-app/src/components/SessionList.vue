<template>
  <f7-list media-list>
    <f7-list-item
      v-for="session in sessions"
      :key="session.id"
      :title="session.userName || 'Visitante'"
      :subtitle="getStatusText(session.status)"
      :link="`/chat/${session.id}`"
      :badge="session.unreadCount"
      badge-color="red"
    >
      <template #media>
        <f7-icon :icon="getStatusIcon(session.status)" :color="getStatusColor(session.status)"></f7-icon>
      </template>
      <template #after>
        <span>{{ formatTime(session.lastMessageAt) }}</span>
      </template>
    </f7-list-item>
  </f7-list>
</template>

<script>
export default {
  props: {
    sessions: Array
  },
  methods: {
    getStatusText(status) {
      const map = {
        active: 'Activa',
        waiting: 'Esperando agente',
        bot: 'Con Bot',
        inactive: 'Inactiva',
        transfer_email: 'Transferida a Email'
      };
      return map[status] || status;
    },
    getStatusIcon(status) {
      if (status === 'bot') return 'f7:robot';
      return 'f7:circle_fill';
    },
    getStatusColor(status) {
      const map = {
        active: 'green',
        waiting: 'yellow',
        bot: 'blue',
        inactive: 'gray',
        transfer_email: 'orange'
      };
      return map[status] || 'gray';
    },
    formatTime(timestamp) {
      if (!timestamp) return '';
      // Simple format
      return new Date(timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
};
</script>
