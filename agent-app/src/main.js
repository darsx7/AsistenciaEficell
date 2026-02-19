import { createApp } from 'vue';
import Framework7 from 'framework7/lite-bundle';
import Framework7Vue, { registerComponents } from 'framework7-vue/bundle';
import { createPinia } from 'pinia';
import App from './App.vue';
import routes from './routes.js';

import 'framework7/css/bundle';
import 'framework7-icons/css/framework7-icons.css';

Framework7.use(Framework7Vue);

const app = createApp(App);
const pinia = createPinia();

registerComponents(app);

app.use(pinia);
app.mount('#app');
