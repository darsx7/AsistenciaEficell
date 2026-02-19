<template>
  <div class="audio-recorder">
    <div v-if="recording" class="recording-ui">
      <span>Grabando... {{ duration }}s</span>
      <f7-button small color="red" @click="cancel">🗑️</f7-button>
    </div>

    <div v-else-if="hasAudio" class="review-ui">
      <f7-button small @click="play">▶️</f7-button>
      <f7-button small @click="resume">Resume</f7-button>
      <f7-button small @click="send">📤</f7-button>
      <f7-button small color="red" @click="discard">🗑️</f7-button>
    </div>

    <!-- Hold Button -->
    <f7-button
      v-else
      class="mic-btn"
      icon-f7="mic"
      @touchstart="start"
      @touchend="pause"
      @mousedown="start"
      @mouseup="pause"
    ></f7-button>
  </div>
</template>

<script>
export default {
  emits: ['send'],
  data() {
    return {
      recording: false,
      hasAudio: false,
      duration: 0,
      interval: null,
      chunks: []
    };
  },
  methods: {
    start() {
      this.recording = true;
      this.hasAudio = false;
      this.startTimer();
      console.log("Start recording");
    },
    pause() {
      this.recording = false;
      this.hasAudio = true;
      this.stopTimer();
      console.log("Pause recording");
    },
    resume() {
        this.recording = true;
        this.hasAudio = false;
        this.startTimer();
        console.log("Resume recording");
    },
    startTimer() {
        this.interval = setInterval(() => { this.duration++; }, 1000);
    },
    stopTimer() {
        clearInterval(this.interval);
    },
    play() {
        console.log("Playing preview");
    },
    send() {
        this.$emit('send', new Blob(this.chunks));
        this.reset();
    },
    cancel() {
        this.reset();
    },
    discard() {
        this.reset();
    },
    reset() {
        this.recording = false;
        this.hasAudio = false;
        this.duration = 0;
        this.chunks = [];
        this.stopTimer();
    }
  }
};
</script>
<style scoped>
.audio-recorder {
    display: inline-block;
}
.mic-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #eee;
}
</style>
