/**
 * ============================================================================
 * MicroLedger Vue 3 Client Application Bootstrap & Vuetify Theme
 * ============================================================================
 *
 * PURPOSE:
 * Initializes the root Vue 3 single page application, mounts Pinia state store,
 * registers Vue Router, and configures the Vuetify 3 component framework with
 * the strict MicroLedger enterprise color palette.
 *
 * THEME SPECIFICATIONS:
 * - primary: #253d90 (Deep Royal Navy / Indigo)
 * - secondary: #64748b (Slate Gray)
 * - success: #17866d (Emerald Teal)
 * - warning: #c4832d (Amber Ochre)
 * - error: #c64c4c (Crimson Red)
 * - background: #f5f7fb (Glacier Canvas)
 * - surface: #ffffff (Pure White)
 */

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
