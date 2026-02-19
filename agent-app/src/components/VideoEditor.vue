<template>
  <f7-popup v-model:opened="isOpened">
    <f7-view>
      <f7-page>
        <f7-navbar title="Editar Video">
          <f7-nav-right>
            <f7-link @click="isOpened = false">Cancelar</f7-link>
            <f7-link @click="send">Enviar Todos</f7-link>
          </f7-nav-right>
        </f7-navbar>

        <div class="video-preview">
          <video ref="video" :src="currentVideo.src" controls></video>
        </div>

        <f7-block>
          <f7-range
            :min="0"
            :max="currentVideo.duration || 100"
            :value="[currentVideo.start, currentVideo.end]"
            dual
            label
            @range:change="onRangeChange"
          ></f7-range>
          <div class="controls">
            <f7-button small outline @click="toggleMute">
              {{ currentVideo.muted ? '🔇 Silenciado' : '🔊 Con sonido' }}
            </f7-button>
          </div>
        </f7-block>

        <!-- Lista Inferior -->
        <f7-toolbar bottom scrollable>
          <f7-link
            v-for="(vid, index) in videos"
            :key="index"
            @click="selectVideo(index)"
            :class="{active: currentIndex === index}"
          >
            Video {{ index + 1 }}
          </f7-link>
        </f7-toolbar>
      </f7-page>
    </f7-view>
  </f7-popup>
</template>

<script>
export default {
  props: {
    opened: Boolean,
    videoFiles: Array // Array of File objects
  },
  emits: ['update:opened', 'send'],
  data() {
    return {
      videos: [], // { src, duration, start, end, muted, file }
      currentIndex: 0
    };
  },
  computed: {
    isOpened: {
      get() { return this.opened; },
      set(val) { this.$emit('update:opened', val); }
    },
    currentVideo() {
      return this.videos[this.currentIndex] || {};
    }
  },
  watch: {
    opened(val) {
      if (val && this.videoFiles.length > 0) {
        // Init logic: create URLs, read metadata
        this.videos = this.videoFiles.map(f => ({
            src: URL.createObjectURL(f),
            duration: 60, // Mock, needs loadedmetadata event
            start: 0,
            end: 60,
            muted: false,
            file: f
        }));
      }
    }
  },
  methods: {
    selectVideo(index) {
      this.currentIndex = index;
    },
    onRangeChange(val) {
      this.videos[this.currentIndex].start = val[0];
      this.videos[this.currentIndex].end = val[1];
    },
    toggleMute() {
      this.videos[this.currentIndex].muted = !this.videos[this.currentIndex].muted;
    },
    send() {
      // Process videos (mocked) and emit
      this.$emit('send', this.videos);
      this.isOpened = false;
    }
  }
};
</script>
<style scoped>
.video-preview {
  height: 50vh;
  background: black;
  display: flex;
  justify-content: center;
}
video {
  max-width: 100%;
  max-height: 100%;
}
</style>
