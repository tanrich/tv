import './assets/main.css';
import 'view-ui-plus/dist/styles/viewuiplus.css';
import 'video.js/dist/video-js.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
