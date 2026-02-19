<template>
  <f7-page name="home">
    <!-- Global Top Bar -->
    <f7-navbar title="Asistencia Eficell">
      <f7-nav-right>
        <f7-link icon-f7="bell" @click="showNotifications = true">
          <span v-if="unreadCount > 0" class="badge color-red">{{ unreadCount }}</span>
        </f7-link>
      </f7-nav-right>
    </f7-navbar>

    <!-- Bottom Nav Tabs -->
    <f7-toolbar tabbar bottom>
      <f7-link tab-link="#tab-chat" tab-link-active text="Chat" icon-f7="chat_bubble"></f7-link>
      <f7-link tab-link="#tab-profile" text="Perfil" icon-f7="person"></f7-link>
      <f7-link tab-link="#tab-emails" text="Correos" icon-f7="envelope"></f7-link>
      <f7-link tab-link="#tab-config" text="Config" icon-f7="gear"></f7-link>
    </f7-toolbar>

    <!-- Tabs Content -->
    <f7-tabs>
      <f7-tab id="tab-chat" tab-active class="page-content">
        <f7-block-title>Sesiones</f7-block-title>
        <SessionList :sessions="allSessions" />
      </f7-tab>
      <f7-tab id="tab-profile" class="page-content">
        <f7-block>Perfil (Ver /profile/)</f7-block>
      </f7-tab>
      <f7-tab id="tab-emails" class="page-content">
        <f7-block>Correos (Próximamente)</f7-block>
      </f7-tab>
      <f7-tab id="tab-config" class="page-content">
        <f7-block>Configuración (Ver /settings/)</f7-block>
      </f7-tab>
    </f7-tabs>

    <NotificationPanel v-model:opened="showNotifications" />
  </f7-page>
</template>

<script>
import { useSessionsStore } from '../store/sessions.js';
import SessionList from '../components/SessionList.vue';
import NotificationPanel from '../components/NotificationPanel.vue';

export default {
  components: { SessionList, NotificationPanel },
  data() {
    return {
      showNotifications: false
    };
  },
  computed: {
    allSessions() {
      const store = useSessionsStore();
      return store.sessions; // Filter logic can be added here or in store
    },
    unreadCount() {
      return useSessionsStore().unreadNotificationsCount;
    }
  },
  mounted() {
    const store = useSessionsStore();
    store.initListener();
  }
};
</script>
