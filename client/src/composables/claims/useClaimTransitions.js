import { reactive, ref } from 'vue';
import { apiRequest } from '../../api/client.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';

/**
 * Standard resolution options available when a repair returns from a supplier or workshop.
 */
export const CLAIM_RESOLUTIONS = [
  { title: 'Repaired', value: 'repaired' },
  { title: 'Replaced', value: 'replaced' },
  { title: 'Cannot repair', value: 'cannot_repair' },
  { title: 'Other', value: 'other' },
];

/**
 * Composable managing claim status transitions, supplier dispatch fields,
 * and irreversible terminal confirmations (Rejected, Cancelled).
 *
 * @param {Object} options - Configuration options.
 * @param {import('vue').Ref<boolean>} options.isAdmin - Indicates if current user is admin.
 * @param {Function} options.onTransitionSuccess - Callback invoked after a transition completes.
 * @returns {Object} Transition state and handler methods.
 */
export function useClaimTransitions({ isAdmin, onTransitionSuccess }) {
  /**
   * Status change modal visibility.
   */
  const transitionOpen = ref(false);

  /**
   * Irreversible confirmation modal visibility.
   */
  const finalConfirmOpen = ref(false);

  /**
   * Target claim record being transitioned.
   */
  const selectedClaim = ref(null);

  /**
   * Transition state input form.
   */
  const change = reactive({
    status: '',
    supplierId: null,
    sentDate: '',
    expectedReturnDate: '',
    actualReturnDate: '',
    collectedDate: '',
    resolution: '',
    reason: '',
  });

  /**
   * Transition validation errors.
   */
  const fieldErrors = ref({});

  /**
   * Operation error message banner.
   */
  const transitionError = ref('');

  /**
   * Network in-flight state.
   */
  const busy = ref(false);

  /**
   * Returns valid next status transitions for a given claim.
   *
   * @param {Object} claim - Target claim record.
   * @returns {Array<string>} Allowed status names.
   */
  function availableTransitions(claim) {
    if (!claim || !claim.status) {
      return [];
    }

    const transitions = {
      Submitted: [
        'With Supplier',
        'Ready for Customer',
        ...(isAdmin.value ? ['Rejected', 'Cancelled'] : []),
      ],
      'With Supplier': [
        'Returned',
        ...(isAdmin.value ? ['Cancelled'] : []),
      ],
      Returned: ['Ready for Customer'],
      'Ready for Customer': ['Completed'],
    };

    return transitions[claim.status] || [];
  }

  /**
   * Prepares the status change modal for a claim.
   *
   * @param {Object} row - Claim record to transition.
   */
  function startTransition(row) {
    selectedClaim.value = row;
    transitionError.value = '';
    fieldErrors.value = {};
    Object.assign(change, {
      status: '',
      supplierId: null,
      sentDate: '',
      expectedReturnDate: '',
      actualReturnDate: '',
      collectedDate: '',
      resolution: '',
      reason: '',
    });
    transitionOpen.value = true;
  }

  /**
   * Submits a state machine transition with specific required fields per target state.
   */
  async function transition() {
    if (!selectedClaim.value || !change.status) {
      return;
    }

    busy.value = true;
    transitionError.value = '';
    fieldErrors.value = {};

    const data = {};
    const allowedKeysMap = {
      'With Supplier': ['supplierId', 'sentDate', 'expectedReturnDate'],
      Returned: ['actualReturnDate', 'resolution'],
      'Ready for Customer': ['resolution'],
      Completed: ['collectedDate'],
      Rejected: ['reason'],
      Cancelled: ['reason'],
    };

    const allowedKeys = allowedKeysMap[change.status] || [];
    for (const key of allowedKeys) {
      if (change[key] !== undefined && change[key] !== null && change[key] !== '') {
        data[key] = change[key];
      }
    }

    try {
      await apiRequest(`/claims/${selectedClaim.value.id}/transitions`, {
        method: 'POST',
        body: {
          status: change.status,
          data,
        },
      });

      finalConfirmOpen.value = false;
      transitionOpen.value = false;

      if (typeof onTransitionSuccess === 'function') {
        await onTransitionSuccess(selectedClaim.value);
      }
    } catch (requestError) {
      const mapped = fieldErrorsFrom(requestError, {
        'data.supplierId': 'supplierId',
        'data.sentDate': 'sentDate',
        'data.expectedReturnDate': 'expectedReturnDate',
        'data.actualReturnDate': 'actualReturnDate',
        'data.collectedDate': 'collectedDate',
        'data.resolution': 'resolution',
        'data.reason': 'reason',
      });

      fieldErrors.value = mapped.fields;
      transitionError.value = mapped.globalMessage;
    } finally {
      busy.value = false;
    }
  }

  /**
   * Validates if irreversible terminal confirmation is needed before transitioning.
   */
  function requestTransition() {
    if (['Rejected', 'Cancelled'].includes(change.status)) {
      finalConfirmOpen.value = true;
      return;
    }
    transition();
  }

  return {
    transitionOpen,
    finalConfirmOpen,
    selectedClaim,
    change,
    fieldErrors,
    transitionError,
    busy,
    resolutionOptions: CLAIM_RESOLUTIONS,
    availableTransitions,
    startTransition,
    transition,
    requestTransition,
  };
}

