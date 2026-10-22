import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import './styles.css';
import App from './App.vue';
import router from './router/index.js';

const vuetify = createVuetify({
  icons: { defaultSet: 'mdi' },
  display: {
    mobileBreakpoint: 'sm',
  },
  theme: {
    defaultTheme: 'microledgerLight',
    themes: {
      microledgerLight: {
        dark: false,
        colors: {
          primary: '#253d90',
          secondary: '#64748b',
          success: '#17866d',
          warning: '#c4832d',
          error: '#c64c4c',
          background: '#f5f7fb',
          surface: '#ffffff',
        },
      },
    },
  },
});

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app');
