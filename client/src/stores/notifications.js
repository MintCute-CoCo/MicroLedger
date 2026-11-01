/**
 * ============================================================================
 * MicroLedger Global Notifications & Toast Alert Store (Pinia)
 * ============================================================================
 *
 * PURPOSE:
 * Manages transient global banner and snackbar notifications across panels
 * (e.g., successful sale checkout confirmations, inventory adjustments).
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNotificationsStore = defineStore('notifications', () => {
  /** Active notification message text */
  const message = ref('');

  /**
   * Dispatches a global notification message to be displayed in the app snackbar.
   *
   * @param {string} nextMessage - Notification text.
   */
  function notify(nextMessage) {
    message.value = nextMessage;
  }

  /**
   * Dismisses and clears the active notification.
   */
  function clear() {
    message.value = '';
  }

  return {
    message,
    notify,
    clear,
  };
});
