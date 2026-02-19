<template>
  <f7-app v-bind="f7params">
    <f7-view main class="safe-areas" url="/"></f7-view>
  </f7-app>
</template>

<script>
import routes from './routes.js';

export default {
  data() {
    return {
      f7params: {
        name: 'Agente Eficell',
        theme: 'md', // Android theme
        routes: routes,
      }
    };
  }
};
</script>
