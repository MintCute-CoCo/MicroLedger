<script setup>
import { useAppNavigation } from './composables/layout/useAppNavigation.js';

/**
 * Root application shell layout composable handling navigation drawer,
 * profile headers, route metadata, and session teardown.
 */
const {
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
  primaryRoutes,
  adminRoutes,
  dismissToast,
  signOut,
} = useAppNavigation();
</script>

<template>
  <v-app>
    <router-view v-if="standalone" />

    <template v-else>
      <v-navigation-drawer
        v-model="drawer"
        :permanent="!mobile"
        :temporary="mobile"
        :width="248"
        class="app-drawer"
      >
        <div class="brand-lockup">
          <div class="brand-mark">
            <v-icon
              icon="mdi-chart-box-outline"
              size="23"
            />
          </div>
          <div>
            <div class="brand-name">microledger</div>
            <div class="brand-caption">STORE WORKSPACE</div>
          </div>
        </div>

        <div class="nav-label">WORKSPACE</div>
        <v-list
          nav
          class="nav-list"
          density="comfortable"
        >
          <v-list-item
            v-for="item in primaryRoutes"
            :key="item.name"
            :to="{ name: item.name }"
            :prepend-icon="item.icon"
            :title="item.title"
            rounded="lg"
            color="primary"
            @click="mobile && (drawer = false)"
          />
        </v-list>

        <v-list
          v-if="auth.user?.role === 'staff'"
          nav
          class="nav-list"
          density="comfortable"
        >
          <v-list-item
            to="/reports"
            prepend-icon="mdi-chart-box-outline"
            title="Warranty report"
            rounded="lg"
            color="primary"
          />
        </v-list>

        <div class="nav-label nav-label-lower">MANAGE</div>
        <v-list
          nav
          class="nav-list"
          density="comfortable"
        >
          <v-list-item
            v-for="item in adminRoutes"
            v-show="auth.user?.role === 'admin'"
            :key="item.name"
            :to="{ name: item.name }"
            :prepend-icon="item.icon"
            :title="item.title"
            rounded="lg"
            color="primary"
          />
        </v-list>

        <template #append>
          <div class="drawer-bottom">
            <button
              class="profile-row"
              type="button"
            >
              <div class="profile-avatar">{{ profileInitials }}</div>
              <div class="profile-copy">
                <strong>{{ profileName }}</strong>
                <span>{{ profileRole }}</span>
              </div>
              <v-btn
                icon="mdi-logout"
                variant="text"
                size="small"
                aria-label="Sign out"
                @click.stop="signOut"
              />
            </button>
          </div>
        </template>
      </v-navigation-drawer>

      <v-main class="app-main">
        <header class="topbar">
          <div class="topbar-left">
            <v-btn
              v-if="mobile"
              icon="mdi-menu"
              variant="text"
              aria-label="Open navigation"
              @click="drawer = !drawer"
            />
            <div class="breadcrumbs">
              <span>Workspace</span>
              <v-icon
                icon="mdi-chevron-right"
                size="15"
              />
              <strong>{{ title }}</strong>
            </div>
          </div>

          <div class="topbar-actions">
            <div class="top-profile">{{ profileInitials }}</div>
          </div>
        </header>

        <main class="page-frame pa-0">
          <router-view />
        </main>
      </v-main>

      <v-bottom-navigation
        v-if="mobile"
        class="mobile-bottom-nav"
        grow
        color="primary"
      >
        <v-btn
          v-for="item in primaryRoutes.slice(0, 5)"
          :key="item.name"
          :to="{ name: item.name }"
        >
          <v-icon :icon="item.icon" />
          <span>{{ item.title === 'Point of sale' ? 'POS' : item.title }}</span>
        </v-btn>
      </v-bottom-navigation>

      <v-snackbar
        v-model="toastVisible"
        timeout="3200"
        location="bottom end"
        color="grey-darken-4"
        rounded="lg"
      >
        {{ notifications.message }}
        <template #actions>
          <v-btn
            icon="mdi-close"
            variant="text"
            aria-label="Dismiss"
            @click="dismissToast"
          />
        </template>
      </v-snackbar>
    </template>
  </v-app>
</template>
