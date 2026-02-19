<template>
  <f7-popup v-model:opened="isOpened">
    <f7-view>
      <f7-page>
        <f7-navbar title="Editar Video">
          <f7-nav-right>
            <f7-link @click="isOpened = false">Cancelar</f7-link>
            <f7-link @click="send">Enviar</f7-link>
          </f7-nav-right>
        </f7-navbar>

        <div class="video-preview">
          <video
            ref="video"
            :src="currentVideo.src"
            controls
            @loadedmetadata="onMetadataLoaded"
            @timeupdate="checkTime"
          ></video>
        </div>

        <f7-block v-if="currentVideo.src">
          <p>Recortar ({{ formatTime(currentVideo.start) }} - {{ formatTime(currentVideo.end) }})</p>
          <f7-range
            :min="0"
            :max="currentVideo.duration"
            :step="0.1"
            :value="[currentVideo.start, currentVideo.end]"
            dual
            label
            @range:change="onRangeChange"
          ></f7-range>

          <div class="controls padding-top">
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
      return this.videos[this.currentIndex] || { src: '', duration: 0, start: 0, end: 0 };
    }
  },
  watch: {
    opened(val) {
      if (val && this.videoFiles.length > 0) {
        // Init logic: create URLs
        this.videos = this.videoFiles.map(f => ({
            src: URL.createObjectURL(f),
            duration: 0, // Will be set on metadata load
            start: 0,
            end: 0,
            muted: false,
            file: f
        }));
        this.currentIndex = 0;
      }
    }
  },
  methods: {
    onMetadataLoaded(e) {
      const duration = e.target.duration;
      // Update duration for the current video in state
      this.videos[this.currentIndex].duration = duration;
      // Default end to full duration if not set
      if (this.videos[this.currentIndex].end === 0) {
        this.videos[this.currentIndex].end = duration;
      }
    },
    selectVideo(index) {
      this.currentIndex = index;
    },
    onRangeChange(val) {
      // Logic for Trimming UI
      this.videos[this.currentIndex].start = val[0];
      this.videos[this.currentIndex].end = val[1];

      // Update video playback to reflect start trim
      if (this.$refs.video && Math.abs(this.$refs.video.currentTime - val[0]) > 0.5) {
         this.$refs.video.currentTime = val[0];
      }
    },
    checkTime() {
      // Loop playback logic for preview
      if (this.$refs.video) {
        if (this.$refs.video.currentTime >= this.videos[this.currentIndex].end) {
          this.$refs.video.currentTime = this.videos[this.currentIndex].start;
          this.$refs.video.pause(); // Or loop
        }
      }
    },
    toggleMute() {
      this.videos[this.currentIndex].muted = !this.videos[this.currentIndex].muted;
    },
    send() {
      // Emit the metadata alongside the file.
      // The actual processing (ffmpeg) would happen here or we send metadata to server.
      // We send the array of video objects which includes the File and the edit metadata.
      const processedData = this.videos.map(v => ({
          file: v.file,
          metadata: {
              trimStart: v.start,
              trimEnd: v.end,
              isMuted: v.muted
          }
      }));

      this.$emit('send', processedData);
      this.isOpened = false;
    },
    formatTime(seconds) {
      if (!seconds) return '0:00';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
  },
  beforeUnmount() {
    this.videos.forEach(v => URL.revokeObjectURL(v.src));
  }
};
</script>
<style scoped>
.video-preview {
  height: 40vh;
  background: black;
  display: flex;
  justify-content: center;
  align-items: center;
}
video {
  max-width: 100%;
  max-height: 100%;
}
</style>
