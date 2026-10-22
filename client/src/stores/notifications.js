import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNotificationsStore = defineStore('notifications', () => {
  const message = ref('');

  function notify(nextMessage) {
    message.value = nextMessage;
  }

  function clear() {
    message.value = '';
  }

  return {
    message,
    notify,
    clear,
  };
});
