import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { public: true, title: 'Sign in' } },
  { path: '/change-password', name: 'change-password', component: () => import('../views/ChangePasswordView.vue'), meta: { title: 'Change password' } },
  { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { requiresAuth: true, title: 'Overview', icon: 'mdi-view-dashboard-outline' } },
  { path: '/pos', name: 'pos', component: () => import('../views/PosView.vue'), meta: { requiresAuth: true, title: 'Point of sale', icon: 'mdi-point-of-sale' } },
  { path: '/products', name: 'products', component: () => import('../views/ProductsView.vue'), meta: { requiresAuth: true, title: 'Products', icon: 'mdi-package-variant-closed' } },
  { path: '/inventory', name: 'inventory', component: () => import('../views/InventoryView.vue'), meta: { requiresAuth: true, title: 'Inventory', icon: 'mdi-archive-outline' } },
  { path: '/sales', name: 'sales', component: () => import('../views/SalesView.vue'), meta: { requiresAuth: true, title: 'Sales', icon: 'mdi-receipt-text-outline' } },
  { path: '/customers', name: 'customers', component: () => import('../views/CustomersView.vue'), meta: { requiresAuth: true, title: 'Customers', icon: 'mdi-account-group-outline' } },
  { path: '/users', name: 'users', component: () => import('../views/UsersView.vue'), meta: { requiresAuth: true, roles: ['admin'], title: 'Users', icon: 'mdi-account-cog-outline' } },
  { path: '/categories', name: 'categories', component: () => import('../views/CategoriesView.vue'), meta: { requiresAuth: true, roles: ['admin'], title: 'Categories', icon: 'mdi-shape-outline' } },
  { path: '/audit-logs', name: 'audit-logs', component: () => import('../views/AuditView.vue'), meta: { requiresAuth: true, roles: ['admin'], title: 'Audit log', icon: 'mdi-text-box-search-outline' } },
  { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue'), meta: { requiresAuth: true, roles: ['admin'], title: 'Settings', icon: 'mdi-cog-outline' } },
  { path: '/imports', name: 'imports', component: () => import('../views/ImportsView.vue'), meta: { requiresAuth: true, roles: ['admin'], title: 'Import products', icon: 'mdi-file-upload-outline' } },
  { path: '/reports/sales', name: 'sales-report', component: () => import('../views/SalesReportView.vue'), meta: { requiresAuth: true, roles: ['admin'], title: 'Sales report', icon: 'mdi-chart-line' } },
  { path: '/reports', name: 'reports', component: () => import('../views/ReportsView.vue'), meta: { requiresAuth: true, title: 'Reports and export', icon: 'mdi-chart-box-outline' } },
  { path: '/suppliers', name: 'suppliers', component: () => import('../views/SuppliersView.vue'), meta: { requiresAuth: true, title: 'Suppliers', icon: 'mdi-truck-outline' } },
  { path: '/warranties', name: 'warranties', component: () => import('../views/WarrantiesView.vue'), meta: { requiresAuth: true, title: 'Warranties', icon: 'mdi-shield-check-outline' } },
  { path: '/claims', name: 'claims', component: () => import('../views/ClaimsView.vue'), meta: { requiresAuth: true, title: 'Warranty claims', icon: 'mdi-clipboard-text-outline' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

if (typeof window !== 'undefined') {
  window.addEventListener('microledger:auth-expired', () => router.replace({ name: 'login' }));
}

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.restoreSession();
  if (to.name === 'login') {
    return auth.isAuthenticated ? { name: auth.user.mustChangePassword ? 'change-password' : 'dashboard' } : true;
  }
  if (!auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } };
  if (to.meta.roles && !to.meta.roles.includes(auth.user.role)) return { name: 'dashboard' };
  if (auth.user.mustChangePassword && to.name !== 'change-password') return { name: 'change-password' };
  if (!auth.user.mustChangePassword && to.name === 'change-password') return { name: 'dashboard' };
  return true;
});

export default router;
