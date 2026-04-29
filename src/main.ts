import './assets/main.css';
import 'view-ui-plus/dist/styles/viewuiplus.css';

import { createApp } from 'vue';

import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(router);

app.mount('#app');
