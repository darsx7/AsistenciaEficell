<template>
  <f7-page name="chat">
    <f7-navbar>
      <f7-nav-left back-link="Sesiones"></f7-nav-left>
      <f7-nav-title>{{ sessionName }}</f7-nav-title>
      <f7-nav-right>
        <f7-link icon-f7="arrow_right_arrow_left" @click="openTransferSheet" title="Transferir"></f7-link>
        <f7-link icon-f7="info_circle" panel-open="right" title="Info"></f7-link>
      </f7-nav-right>
    </f7-navbar>

    <f7-messages ref="messages">
      <f7-message
        v-for="msg in messages"
        :key="msg.id"
        :type="msg.sender === 'user' ? 'received' : 'sent'"
        :text="getMsgText(msg)"
        :image="msg.type === 'image' ? msg.content : null"
      >
        <template #bubble-end>
           <div v-if="msg.type === 'audio'">
             <audio controls :src="msg.content" style="max-width: 200px;"></audio>
           </div>
           <div v-if="msg.type === 'video'">
             <video controls :src="msg.content" style="max-width: 200px;"></video>
           </div>
           <div v-if="msg.type === 'location'">
             <a :href="`https://maps.google.com/?q=${msg.location.lat},${msg.location.lng}`" target="_blank">📍 Ver mapa</a>
           </div>
        </template>
      </f7-message>
    </f7-messages>

    <!-- Barra Input -->
    <f7-messagebar
      placeholder="Mensaje..."
      ref="messagebar"
      v-model:value="messageText"
    >
      <template #left>
        <f7-link icon-f7="paperclip" @click="openAttachments"></f7-link>
      </template>
      <template #right>
        <f7-link v-if="messageText" icon-f7="arrow_up_circle_fill" @click="sendText"></f7-link>
        <div v-else>
           <!-- Audio Recorder Component Integrated -->
           <AudioRecorder @send="handleAudioSend" />
        </div>
      </template>
    </f7-messagebar>

    <!-- Hidden File Inputs -->
    <input type="file" ref="fileInput" class="hidden" @change="handleFileUpload">
    <input type="file" ref="imageInput" accept="image/*" class="hidden" @change="handleImageUpload">
    <input type="file" ref="videoInput" accept="video/*" class="hidden" @change="handleVideoUpload">

    <!-- Editors -->
    <ImageEditor v-model:opened="showImageEditor" :imageSrc="tempImageSrc" @save="handleImageSave" />
    <VideoEditor v-model:opened="showVideoEditor" :videoFiles="tempVideoFiles" @send="handleVideoSave" />

    <!-- Right Panel for Session Info -->
    <f7-panel right cover resizable>
      <f7-view>
        <f7-page>
          <f7-navbar title="Info de Sesión"></f7-navbar>
          <f7-block-title>Detalles</f7-block-title>
          <f7-list>
            <f7-list-item title="ID" :after="sessionId"></f7-list-item>
            <f7-list-item title="Estado" :after="sessionStatus"></f7-list-item>
            <f7-list-item title="Usuario" :after="sessionName"></f7-list-item>
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

          <!-- Attachments Panel (User) -->
          <f7-block-title>Adjuntos del Usuario</f7-block-title>
          <f7-list>
             <f7-list-item title="Ver Archivos" link="#" @click="openUserAttachments('files')"></f7-list-item>
             <f7-list-item title="Ver Media" link="#" @click="openUserAttachments('media')"></f7-list-item>
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
import { AgentFirebaseService } from '../services/firebase.js';
import ImageEditor from '../components/ImageEditor.vue';
import VideoEditor from '../components/VideoEditor.vue';
import AudioRecorder from '../components/AudioRecorder.vue';

export default {
  components: { ImageEditor, VideoEditor, AudioRecorder },
  props: {
    f7route: Object,
  },
  data() {
    return {
      messageText: '',
      messages: [],
      session: null,
      // Editor states
      showImageEditor: false,
      tempImageSrc: null,
      showVideoEditor: false,
      tempVideoFiles: [],
      unsubscribeSession: null,
      unsubscribeMessages: null
    };
  },
  computed: {
    sessionId() { return this.f7route.params.id; },
    sessionName() { return this.session?.userName || 'Usuario'; },
    sessionStatus() { return this.session?.status || ''; },
    permissions() { return this.session?.permissions || { allowFile: false, allowAudio: false, allowLocation: false }; }
  },
  mounted() {
    // 1. Listen to Session
    this.unsubscribeSession = AgentFirebaseService.listenToSession(this.sessionId, (data) => {
        this.session = data;
    });
    // 2. Listen to Messages
    this.unsubscribeMessages = AgentFirebaseService.listenToMessages(this.sessionId, (msgs) => {
        this.messages = msgs;
    });
  },
  beforeUnmount() {
    if (this.unsubscribeSession) this.unsubscribeSession();
    if (this.unsubscribeMessages) this.unsubscribeMessages();
  },
  methods: {
    getMsgText(msg) {
        if (msg.type === 'text' || msg.type === 'system') return msg.content;
        return '';
    },
    async sendText() {
        if (!this.messageText.trim()) return;
        await AgentFirebaseService.sendMessage(this.sessionId, {
            type: 'text',
            content: this.messageText
        });
        this.messageText = '';
    },
    async togglePerm(perm) {
        if (!this.session) return;
        const newPerms = { ...this.permissions };
        newPerms[perm] = !newPerms[perm];
        await AgentFirebaseService.updatePermissions(this.sessionId, newPerms);
    },
    disconnect() {
        f7.dialog.confirm('¿Desconectarse?', async () => {
            await AgentFirebaseService.endSession(this.sessionId);
            f7.views.main.router.back();
        });
    },
    deleteChat() {
        f7.dialog.confirm('¿Eliminar chat?', async () => {
            await AgentFirebaseService.deleteSession(this.sessionId);
            f7.views.main.router.back();
        });
    },

    // Attachments Logic
    openAttachments() {
        f7.actions.create({
            buttons: [
                {
                    text: '📷 Cámara (Foto)',
                    onClick: () => {
                        // Simulate camera input via file input for web
                        this.$refs.imageInput.click();
                    }
                },
                {
                    text: '📁 Archivos',
                    onClick: () => { this.$refs.fileInput.click(); }
                },
                {
                    text: '🖼️ Media (Galería)',
                    onClick: () => {
                        // Logic to ask Image or Video
                        f7.dialog.create({
                            title: 'Tipo de Media',
                            buttons: [
                                { text: 'Imagen', onClick: () => this.$refs.imageInput.click() },
                                { text: 'Video', onClick: () => this.$refs.videoInput.click() }
                            ]
                        }).open();
                    }
                },
                {
                    text: '📍 Ubicación',
                    onClick: () => { this.sendLocation(); }
                },
                {
                    text: 'Cancelar',
                    color: 'red'
                }
            ]
        }).open();
    },

    // File Handling
    handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Auto-detect image
        if (file.type.startsWith('image/')) {
            this.openImageEditor(file);
        } else {
            this.uploadAndSend(file, 'file');
        }
    },
    handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) this.openImageEditor(file);
    },
    handleVideoUpload(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            this.tempVideoFiles = files;
            this.showVideoEditor = true;
        }
    },

    // Editor Handlers
    openImageEditor(file) {
        this.tempImageSrc = URL.createObjectURL(file);
        this.showImageEditor = true;
    },
    async handleImageSave(blob) {
        const url = await AgentFirebaseService.uploadFile(blob, this.sessionId);
        await AgentFirebaseService.sendMessage(this.sessionId, { type: 'image', content: url });
    },
    async handleVideoSave(videoDataArray) {
        // videoDataArray = [{ file, metadata }]
        for (const v of videoDataArray) {
            const url = await AgentFirebaseService.uploadFile(v.file, this.sessionId);
            await AgentFirebaseService.sendMessage(this.sessionId, {
                type: 'video',
                content: url,
                metadata: v.metadata
            });
        }
    },
    async handleAudioSend(blob) {
        const url = await AgentFirebaseService.uploadFile(blob, this.sessionId);
        await AgentFirebaseService.sendMessage(this.sessionId, { type: 'audio', content: url });
    },

    // Location
    sendLocation() {
        // Mocked Map Module for brevity, assumes confirmation
        f7.dialog.prompt('Confirmar dirección detected:', (addr) => {
            AgentFirebaseService.sendMessage(this.sessionId, {
                type: 'location',
                location: { lat: 0, lng: 0, address: addr }
            });
        }, () => {}, 'Dirección detectada 123');
    },

    // Transfer
    openTransferSheet() {
        f7.actions.create({
            buttons: [
                {
                    text: 'Transferir a otro agente',
                    onClick: () => {
                        // Mock select agent flow
                        f7.dialog.prompt('ID del Agente destino:', (id) => {
                            AgentFirebaseService.transferChat(this.sessionId, id);
                        });
                    }
                },
                {
                    text: 'Transferir a Email',
                    onClick: () => {
                        // Email form logic
                        f7.dialog.prompt('Email destino:', (email) => {
                            AgentFirebaseService.transferEmail(this.sessionId, { userEmail: email });
                        });
                    }
                },
                { text: 'Cancelar', color: 'red' }
            ]
        }).open();
    },

    openUserAttachments(tab) {
        console.log("Open user attachments tab", tab);
        // Navigate to dedicated page if needed
    }
  }
};
</script>
<style scoped>
.hidden { display: none; }
</style>
