<script setup>
import ResponsiveTable from '../ResponsiveTable.vue';
import { formatDateTime } from '../../utils/format.js';

const props = defineProps({
  users: {
    type: Array,
    default: () => [],
  },
  activeCount: {
    type: Number,
    default: 0,
  },
  headers: {
    type: Array,
    default: () => [],
  },
  loading: Boolean,
  getUserInitials: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits([
  'reload',
  'make-admin',
  'make-staff',
  'toggle-status',
  'reset-password',
]);
</script>

<template>
  <v-row>
    <v-col cols="12" sm="6">
      <v-card rounded="xl" variant="outlined" class="pa-4">
        <div class="d-flex align-center ga-3">
          <v-avatar color="primary" variant="tonal" rounded="lg">
            <v-icon icon="mdi-account-group-outline" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Store users</div>
            <div class="text-h6 font-weight-bold">{{ props.users.length }}</div>
          </div>
        </div>
      </v-card>
    </v-col>
    <v-col cols="12" sm="6">
      <v-card rounded="xl" variant="outlined" class="pa-4">
        <div class="d-flex align-center ga-3">
          <v-avatar color="success" variant="tonal" rounded="lg">
            <v-icon icon="mdi-account-check-outline" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Active admins</div>
            <div class="text-h6 font-weight-bold">{{ props.activeCount }}</div>
          </div>
        </div>
      </v-card>
    </v-col>

    <v-col cols="12">
      <v-card rounded="xl" variant="outlined">
        <v-card-title class="d-flex align-center justify-space-between ga-2">
          <div>
            <div class="text-h6 font-weight-bold">Store team</div>
            <div class="text-caption text-medium-emphasis">
              Users are retained when deactivated; their sessions are revoked.
            </div>
          </div>
          <v-btn
            icon="mdi-refresh"
            variant="outlined"
            aria-label="Reload users"
            :loading="props.loading"
            @click="emit('reload')"
          />
        </v-card-title>

        <ResponsiveTable
          :headers="props.headers"
          :items="props.users"
          :loading="props.loading"
          :items-per-page="10"
        >
          <template #item.fullName="{ item }">
            <div class="d-flex align-center ga-2">
              <v-avatar color="primary" variant="tonal" size="32">
                <span class="text-caption">{{ props.getUserInitials(item) }}</span>
              </v-avatar>
              <strong class="text-body-2">{{ item.fullName }}</strong>
            </div>
          </template>
          <template #item.role="{ item }">
            <v-chip
              size="small"
              :color="item.role === 'admin' ? 'primary' : 'default'"
              variant="tonal"
            >
              {{ item.role }}
            </v-chip>
          </template>
          <template #item.status="{ item }">
            <v-chip
              size="small"
              :color="item.status === 'active' ? 'success' : 'error'"
              variant="tonal"
            >
              {{ item.status }}
            </v-chip>
          </template>
          <template #item.lastLoginAt="{ item }">
            <span class="text-body-2">
              {{ item.lastLoginAt ? formatDateTime(item.lastLoginAt) : 'Never' }}
            </span>
          </template>
          <template #item.actions="{ item }">
            <v-menu>
              <template #activator="{ props: menuProps }">
                <v-btn
                  v-bind="menuProps"
                  icon="mdi-dots-horizontal"
                  variant="text"
                  size="small"
                  :aria-label="`Actions for ${item.username}`"
                />
              </template>
              <v-list density="compact">
                <v-list-item
                  title="Make Admin"
                  prepend-icon="mdi-shield-account-outline"
                  :disabled="item.role === 'admin' || item.status !== 'active'"
                  @click="emit('make-admin', item)"
                />
                <v-list-item
                  title="Make Staff"
                  prepend-icon="mdi-account-outline"
                  :disabled="item.role === 'staff' || (item.role === 'admin' && props.activeCount <= 1)"
                  @click="emit('make-staff', item)"
                />
                <v-list-item
                  :title="item.status === 'active' ? 'Deactivate' : 'Reactivate'"
                  :prepend-icon="item.status === 'active'
                    ? 'mdi-account-cancel-outline'
                    : 'mdi-account-check-outline'"
                  :disabled="item.role === 'admin' && item.status === 'active' && props.activeCount <= 1"
                  @click="emit('toggle-status', item)"
                />
                <v-list-item
                  title="Reset password"
                  prepend-icon="mdi-lock-reset"
                  @click="emit('reset-password', item)"
                />
              </v-list>
            </v-menu>
          </template>
        </ResponsiveTable>
      </v-card>
    </v-col>
  </v-row>
</template>
