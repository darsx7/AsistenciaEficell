<template>
  <div class="audio-recorder">
    <div v-if="isRecording || hasAudio" class="recording-ui">
      <div class="timer">{{ formatDuration(duration) }}</div>

      <div class="controls">
        <f7-button small color="red" @click="discard" v-if="hasAudio && !isRecording">🗑️</f7-button>

        <!-- Playback controls -->
        <f7-button small @click="playAudio" v-if="hasAudio && !isPlaying">▶️</f7-button>
        <f7-button small @click="pauseAudio" v-if="isPlaying">⏸️</f7-button>

        <!-- Recording controls -->
        <f7-button small @click="resumeRecording" v-if="isPaused">🔴 Resume</f7-button>
        <f7-button small @click="pauseRecording" v-if="isRecording">⏸️ Pause</f7-button>

        <f7-button small fill @click="sendAudio" v-if="hasAudio && !isRecording">📤 Enviar</f7-button>
      </div>

      <audio ref="audioPlayer" class="hidden" @ended="isPlaying = false"></audio>
    </div>

    <!-- Initial Hold Button -->
    <f7-button
      v-else
      class="mic-btn"
      icon-f7="mic"
      @touchstart.prevent="startRecording"
      @touchend.prevent="stopRecording"
      @mousedown.prevent="startRecording"
      @mouseup.prevent="stopRecording"
    ></f7-button>
  </div>
</template>

<script>
export default {
  emits: ['send', 'error'],
  data() {
    return {
      mediaRecorder: null,
      audioChunks: [],
      audioBlob: null,
      audioUrl: null,

      isRecording: false,
      isPaused: false,
      hasAudio: false,
      isPlaying: false,

      duration: 0,
      timerInterval: null,
      startTime: 0
    };
  },
  methods: {
    async startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
          this.audioChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
          this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          this.audioUrl = URL.createObjectURL(this.audioBlob);
          this.hasAudio = true;
          this.isRecording = false;
          this.isPaused = false;
          this.stopTimer();
        };

        this.mediaRecorder.start();
        this.isRecording = true;
        this.startTimer();
      } catch (err) {
        console.error("Error accessing microphone:", err);
        this.$emit('error', 'No se pudo acceder al micrófono');
      }
    },

    stopRecording() {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    },

    pauseRecording() {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.pause();
        this.isPaused = true;
        this.stopTimer();
      }
    },

    resumeRecording() {
      if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
        this.mediaRecorder.resume();
        this.isPaused = false;
        this.startTimer();
      }
    },

    playAudio() {
      if (this.$refs.audioPlayer && this.audioUrl) {
        this.$refs.audioPlayer.src = this.audioUrl;
        this.$refs.audioPlayer.play();
        this.isPlaying = true;
      }
    },

    pauseAudio() {
      if (this.$refs.audioPlayer) {
        this.$refs.audioPlayer.pause();
        this.isPlaying = false;
      }
    },

    discard() {
      this.resetState();
    },

    sendAudio() {
      if (this.audioBlob) {
        this.$emit('send', this.audioBlob);
        this.resetState();
      }
    },

    resetState() {
      this.isRecording = false;
      this.isPaused = false;
      this.hasAudio = false;
      this.isPlaying = false;
      this.duration = 0;
      this.audioChunks = [];
      this.audioBlob = null;
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = null;
      }
      this.stopTimer();
    },

    startTimer() {
      this.stopTimer();
      this.timerInterval = setInterval(() => {
        this.duration++;
      }, 1000);
    },

    stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    },

    formatDuration(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  },
  beforeUnmount() {
    this.stopTimer();
    if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
  }
};
</script>

<style scoped>
.audio-recorder {
  display: flex;
  align-items: center;
  justify-content: center;
}
.mic-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
}
.recording-ui {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f0f0f0;
  padding: 5px 10px;
  border-radius: 20px;
}
.timer {
  font-family: monospace;
  font-weight: bold;
  color: red;
}
.controls {
  display: flex;
  gap: 5px;
}
.hidden {
  display: none;
}
</style>
