<template>
  <f7-popup v-model:opened="isOpened" class="image-editor-popup">
    <f7-view>
      <f7-page>
        <f7-navbar title="Editar Imagen">
          <f7-nav-right>
            <f7-link @click="cancel">Cancelar</f7-link>
            <f7-link @click="save">Enviar</f7-link>
          </f7-nav-right>
        </f7-navbar>

        <div class="canvas-container" ref="container">
          <canvas ref="canvas"></canvas>
        </div>

        <f7-toolbar bottom>
          <f7-link @click="setTool('pen')" :class="{active: tool==='pen'}">🖊️</f7-link>
          <f7-link @click="setTool('text')" :class="{active: tool==='text'}">✏️</f7-link>
          <f7-link @click="crop">✂️</f7-link>
        </f7-toolbar>
      </f7-page>
    </f7-view>
  </f7-popup>
</template>

<script>
export default {
  props: {
    opened: Boolean,
    imageSrc: String
  },
  emits: ['update:opened', 'save'],
  data() {
    return {
      tool: 'pen', // pen, text
      ctx: null
    };
  },
  computed: {
    isOpened: {
      get() { return this.opened; },
      set(val) { this.$emit('update:opened', val); }
    }
  },
  watch: {
    opened(val) {
      if (val && this.imageSrc) {
        this.$nextTick(this.initCanvas);
      }
    }
  },
  methods: {
    initCanvas() {
      const canvas = this.$refs.canvas;
      const ctx = canvas.getContext('2d');
      this.ctx = ctx;

      const img = new Image();
      img.onload = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - 100; // rough calc
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = this.imageSrc;
    },
    setTool(t) {
      this.tool = t;
    },
    crop() {
      console.log("Crop logic (requires library)");
    },
    cancel() {
      this.isOpened = false;
    },
    save() {
      this.$refs.canvas.toBlob((blob) => {
        this.$emit('save', blob);
        this.isOpened = false;
      });
    }
  }
};
</script>
<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  background: #000;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
