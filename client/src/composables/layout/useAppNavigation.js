import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useAuthStore } from '../../stores/auth.js';
import { useNotificationsStore } from '../../stores/notifications.js';
import { apiRequest } from '../../api/client.js';
import { applyDisplaySettings } from '../../utils/format.js';

/**
 * Navigation items for primary everyday store workflows.
 */
export const PRIMARY_ROUTES = [
  { name: 'dashboard', title: 'Overview', icon: 'mdi-view-dashboard-outline' },
  { name: 'pos', title: 'Point of sale', icon: 'mdi-point-of-sale' },
  { name: 'products', title: 'Products', icon: 'mdi-package-variant-closed' },
  { name: 'inventory', title: 'Inventory', icon: 'mdi-archive-outline' },
  { name: 'sales', title: 'Sales', icon: 'mdi-receipt-text-outline' },
  { name: 'customers', title: 'Customers', icon: 'mdi-account-group-outline' },
  { name: 'suppliers', title: 'Suppliers', icon: 'mdi-truck-outline' },
  { name: 'warranties', title: 'Warranties', icon: 'mdi-shield-check-outline' },
  { name: 'claims', title: 'Claims', icon: 'mdi-clipboard-text-outline' },
];

/**
 * Navigation items for administrative and back-office management.
 */
export const ADMIN_ROUTES = [
  { name: 'sales-report', title: 'Sales report', icon: 'mdi-chart-line' },
  { name: 'categories', title: 'Categories', icon: 'mdi-shape-outline' },
  { name: 'users', title: 'Users', icon: 'mdi-account-cog-outline' },
  { name: 'audit-logs', title: 'Audit log', icon: 'mdi-text-box-search-outline' },
  { name: 'imports', title: 'Import products', icon: 'mdi-file-upload-outline' },
  { name: 'reports', title: 'Reports and export', icon: 'mdi-chart-box-outline' },
  { name: 'settings', title: 'Settings', icon: 'mdi-cog-outline' },
];

/**
 * Composable managing global layout shell state, responsive navigation drawer,
 * active user profile metadata, store settings hydration, and sign-out actions.
 *
 * @returns {Object} Layout shell state and interaction handlers.
 */
export function useAppNavigation() {
  const route = useRoute();
  const router = useRouter();
  const auth = useAuthStore();
  const notifications = useNotificationsStore();
  const { mobile } = useDisplay();

  const drawer = ref(null);

  /**
   * Watches active user session and applies backend store display settings.
   */
  watch(
    () => auth.user,
    async (user) => {
      if (!user) {
        applyDisplaySettings();
        return;
      }

      try {
        const settings = await apiRequest('/settings');
        applyDisplaySettings(settings);
      } catch {
        // Keep safe display defaults if settings are temporarily unavailable.
      }
    },
    { immediate: true }
  );

  /**
   * Dynamic page title from route metadata.
   */
  const title = computed(() => {
    return route.meta.title || 'Overview';
  });

  /**
   * Identifies standalone pages that should render without navigation frame.
   */
  const standalone = computed(() => {
    return ['login', 'change-password'].includes(route.name);
  });

  /**
   * Display name of the currently signed-in user.
   */
  const profileName = computed(() => {
    return auth.user?.fullName || 'Alex Morgan';
  });

  /**
   * Formatted role label with title casing.
   */
  const profileRole = computed(() => {
    if (!auth.user?.role) {
      return 'Administrator';
    }
    const roleStr = auth.user.role;
    const firstChar = roleStr.charAt(0).toUpperCase();
    const remaining = roleStr.slice(1);
    return `${firstChar}${remaining}`;
  });

  /**
   * Two-letter initials derived from profile name.
   */
  const profileInitials = computed(() => {
    const parts = profileName.value.split(/\s+/).slice(0, 2);
    const letters = parts.map((part) => part[0] || '');
    return letters.join('').toUpperCase();
  });

  /**
   * Two-way bound visibility for global toast notifications.
   */
  const toastVisible = computed({
    get: () => Boolean(notifications.message),
    set: (visible) => {
      if (!visible) {
        notifications.clear();
      }
    },
  });

  /**
   * Dismisses the active toast notification.
   */
  function dismissToast() {
    notifications.clear();
  }

  /**
   * Terminates active session and redirects to sign-in page.
   */
  async function signOut() {
    await auth.signOut();
    await router.replace('/login');
  }

  return {
    auth,
    notifications,
    drawer,
    mobile,
    title,
    standalone,
    profileName,
    profileRole,
    profileInitials,
    toastVisible,
    primaryRoutes: PRIMARY_ROUTES,
    adminRoutes: ADMIN_ROUTES,
    dismissToast,
    signOut,
  };
}

