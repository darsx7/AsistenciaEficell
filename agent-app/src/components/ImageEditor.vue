<template>
  <f7-popup v-model:opened="isOpened" class="image-editor-popup" @popup:opened="initCanvas">
    <f7-view>
      <f7-page>
        <f7-navbar title="Editar Imagen">
          <f7-nav-right>
            <f7-link @click="cancel">Cancelar</f7-link>
            <f7-link @click="save">Enviar</f7-link>
          </f7-nav-right>
        </f7-navbar>

        <div class="canvas-container" ref="container">
          <canvas
            ref="canvas"
            @mousedown="startDrawing"
            @mousemove="draw"
            @mouseup="stopDrawing"
            @mouseleave="stopDrawing"
            @touchstart="startDrawing"
            @touchmove="draw"
            @touchend="stopDrawing"
          ></canvas>
        </div>

        <f7-toolbar bottom>
          <f7-link @click="setTool('pen')" :class="{active: tool==='pen'}" icon-f7="pencil"></f7-link>
          <f7-link @click="setTool('text')" :class="{active: tool==='text'}">T</f7-link>
          <f7-link @click="setTool('eraser')" :class="{active: tool==='eraser'}" icon-f7="trash"></f7-link>
          <!-- Colors -->
          <f7-link @click="color = 'red'" :style="{color: color === 'red' ? 'red' : ''}">🔴</f7-link>
          <f7-link @click="color = 'black'" :style="{color: color === 'black' ? 'black' : ''}">⚫</f7-link>
          <f7-link @click="color = 'white'" :style="{color: color === 'white' ? 'gray' : ''}">⚪</f7-link>
        </f7-toolbar>
      </f7-page>
    </f7-view>
  </f7-popup>
</template>

<script>
import { f7 } from 'framework7-vue';

export default {
  props: {
    opened: Boolean,
    imageSrc: String
  },
  emits: ['update:opened', 'save'],
  data() {
    return {
      tool: 'pen', // pen, text, eraser
      color: 'red',
      lineWidth: 3,
      isDrawing: false,
      ctx: null,
      lastX: 0,
      lastY: 0,
      imgElement: null
    };
  },
  computed: {
    isOpened: {
      get() { return this.opened; },
      set(val) { this.$emit('update:opened', val); }
    }
  },
  methods: {
    initCanvas() {
      if (!this.imageSrc) return;

      const canvas = this.$refs.canvas;
      const container = this.$refs.container;
      this.ctx = canvas.getContext('2d');

      this.imgElement = new Image();
      this.imgElement.onload = () => {
        // Fit canvas to container but keep aspect ratio or just full width
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        // Draw image keeping aspect ratio
        const scale = Math.min(canvas.width / this.imgElement.width, canvas.height / this.imgElement.height);
        const x = (canvas.width / 2) - (this.imgElement.width / 2) * scale;
        const y = (canvas.height / 2) - (this.imgElement.height / 2) * scale;

        this.ctx.drawImage(this.imgElement, x, y, this.imgElement.width * scale, this.imgElement.height * scale);
      };
      this.imgElement.src = this.imageSrc;
    },

    getCoordinates(e) {
      const canvas = this.$refs.canvas;
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;

      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    },

    startDrawing(e) {
      if (this.tool === 'text') {
        this.addText(e);
        return;
      }
      this.isDrawing = true;
      const { x, y } = this.getCoordinates(e);
      this.lastX = x;
      this.lastY = y;
    },

    draw(e) {
      if (!this.isDrawing) return;
      e.preventDefault(); // Prevent scrolling on touch

      const { x, y } = this.getCoordinates(e);
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(x, y);
      this.ctx.strokeStyle = this.tool === 'eraser' ? 'white' : this.color; // Simple eraser
      this.ctx.lineWidth = this.tool === 'eraser' ? 10 : this.lineWidth;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();

      this.lastX = x;
      this.lastY = y;
    },

    stopDrawing() {
      this.isDrawing = false;
    },

    addText(e) {
      const { x, y } = this.getCoordinates(e);
      f7.dialog.prompt('Texto:', (text) => {
        if (text) {
          this.ctx.fillStyle = this.color;
          this.ctx.font = '20px Arial';
          this.ctx.fillText(text, x, y);
        }
      });
    },

    setTool(t) {
      this.tool = t;
    },

    cancel() {
      this.isOpened = false;
    },

    save() {
      this.$refs.canvas.toBlob((blob) => {
        this.$emit('save', blob);
        this.isOpened = false;
      }, 'image/jpeg', 0.8);
    }
  }
};
</script>
<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  background: #333; /* Dark bg to see limits */
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
canvas {
  background: #fff;
}
</style>
