<template>
  <f7-page name="chat">
    <f7-navbar>
      <f7-nav-left back-link="Sesiones"></f7-nav-left>
      <f7-nav-title>{{ sessionName }}</f7-nav-title>
      <f7-nav-right>
        <f7-link icon-f7="arrow_right_arrow_left" @click="openTransfer" title="Transferir"></f7-link>
        <f7-link icon-f7="info_circle" panel-open="right" title="Info"></f7-link>
      </f7-nav-right>
    </f7-navbar>

    <f7-messages>
      <f7-message
        v-for="msg in messages"
        :key="msg.id"
        :type="msg.sender === 'user' ? 'received' : 'sent'"
        :text="msg.type === 'text' ? msg.content : null"
        :image="msg.type === 'image' ? msg.content : null"
      >
        <template #bubble-end v-if="msg.sender === 'user'">
           <!-- Logic for selecting messages goes here -->
        </template>
      </f7-message>
    </f7-messages>

    <f7-messagebar
      placeholder="Mensaje..."
      ref="messagebar"
      v-model:value="messageText"
    >
      <template #left>
        <f7-link icon-f7="paperclip" @click="openAttachments"></f7-link>
      </template>
      <template #right>
        <f7-link v-if="messageText" icon-f7="arrow_up_circle_fill" @click="sendMessage"></f7-link>
        <f7-link v-else icon-f7="mic" @click="startAudio"></f7-link>
      </template>
    </f7-messagebar>

    <!-- Right Panel for Session Info -->
    <f7-panel right cover resizable>
      <f7-view>
        <f7-page>
          <f7-navbar title="Info de Sesión"></f7-navbar>
          <f7-block-title>Detalles</f7-block-title>
          <f7-list>
            <f7-list-item title="ID" :after="sessionId"></f7-list-item>
            <f7-list-item title="Estado" :after="sessionStatus"></f7-list-item>
          </f7-list>

          <f7-block-title>Opciones Usuario</f7-block-title>
          <f7-list simple-list>
            <f7-list-item title="Adjuntar archivos">
              <f7-toggle :checked="permissions.allowFile" @change="togglePerm('allowFile')"></f7-toggle>
            </f7-list-item>
            <f7-list-item title="Audio">
              <f7-toggle :checked="permissions.allowAudio" @change="togglePerm('allowAudio')"></f7-toggle>
            </f7-list-item>
            <f7-list-item title="Ubicación">
              <f7-toggle :checked="permissions.allowLocation" @change="togglePerm('allowLocation')"></f7-toggle>
            </f7-list-item>
          </f7-list>

          <f7-block>
            <f7-button color="red" outline @click="disconnect">Desconectarme</f7-button>
            <br>
            <f7-button color="red" fill @click="deleteChat">Eliminar chat</f7-button>
          </f7-block>
        </f7-page>
      </f7-view>
    </f7-panel>

  </f7-page>
</template>

<script>
import { f7 } from 'framework7-vue';
import { useSessionsStore } from '../store/sessions.js';

export default {
  props: {
    f7route: Object,
  },
  data() {
    return {
      messageText: '',
      messages: [], // Load from firestore
      session: null
    };
  },
  computed: {
    sessionId() { return this.f7route.params.id; },
    sessionName() { return this.session?.userName || 'Usuario'; },
    sessionStatus() { return this.session?.status || ''; },
    permissions() { return this.session?.permissions || {}; }
  },
  mounted() {
    // Load session details and messages logic would be here
    // Mocking for structure
    this.session = {
        id: this.sessionId,
        userName: 'Usuario Web',
        status: 'active',
        permissions: { allowFile: false, allowAudio: false, allowLocation: false }
    };
  },
  methods: {
    sendMessage() {
        console.log("Send", this.messageText);
        this.messageText = '';
    },
    openAttachments() {
        // Open Action Sheet
        console.log("Attachments");
    },
    startAudio() {
        console.log("Audio");
    },
    togglePerm(perm) {
        this.permissions[perm] = !this.permissions[perm];
        // Save to Firestore
    },
    disconnect() {
        f7.dialog.confirm('¿Desconectarse?', () => { console.log('Disconnected'); });
    },
    deleteChat() {
        f7.dialog.confirm('¿Eliminar chat?', () => { console.log('Deleted'); });
    },
    openTransfer() {
        console.log("Transfer");
    }
  }
};
</script>
