<script setup>
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  todaySales: {
    type: [Number, String],
    default: 0,
  },
  chart: {
    type: Array,
    default: () => [],
  },
  topProducts: {
    type: Array,
    default: () => [],
  },
  reportError: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <v-row class="mt-1">
    <v-col cols="12" lg="7">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div>
          <h2 class="text-h6 font-weight-bold">Sales overview</h2>
          <p class="text-caption text-medium-emphasis mb-0">
            Completed sales for the last seven days
          </p>
        </div>

        <div class="d-flex align-baseline ga-2 mt-4">
          <strong class="text-h5">{{ formatMoney(props.todaySales) }}</strong>
          <span class="text-caption text-medium-emphasis">today</span>
        </div>

        <v-list
          v-if="props.chart.some((bar) => bar.amount > 0)"
          bg-color="transparent"
          density="compact"
          class="dashboard-trend-list mt-2"
        >
          <v-list-item
            v-for="bar in props.chart"
            :key="bar.day"
            :title="bar.day"
          >
            <template #append>
              <div class="dashboard-trend-values">
                <span class="dashboard-trend-total text-caption text-medium-emphasis">
                  {{ formatMoney(bar.total) }}
                </span>
                <div class="dashboard-trend-track">
                  <v-progress-linear
                    :model-value="bar.amount"
                    :color="bar.today ? 'primary' : 'primary-lighten-3'"
                    bg-color="grey-lighten-3"
                    :aria-label="`${bar.day} sales: ${formatMoney(bar.total)}`"
                    height="10"
                    rounded
                  />
                </div>
              </div>
            </template>
          </v-list-item>
        </v-list>
        <v-alert
          v-else
          type="info"
          variant="tonal"
          density="compact"
          class="mt-4"
        >
          {{ props.reportError
            ? 'Sales trend is unavailable.'
            : 'No completed sales in the last seven days.' }}
        </v-alert>
      </v-card>
    </v-col>

    <v-col cols="12" lg="5">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-start justify-space-between ga-2">
          <div>
            <h2 class="text-h6 font-weight-bold">Top products</h2>
            <p class="text-caption text-medium-emphasis mb-0">
              Best sellers in the last seven days
            </p>
          </div>
          <v-btn
            to="/products"
            variant="text"
            color="primary"
            append-icon="mdi-arrow-right"
          >
            View all
          </v-btn>
        </div>

        <v-list v-if="props.topProducts.length" lines="two" class="mt-2">
          <v-list-item
            v-for="(product, index) in props.topProducts"
            :key="product.name"
            :title="`${index + 1}. ${product.name}`"
            :subtitle="`${product.units} units sold`"
          >
            <template #prepend>
              <v-avatar color="primary" variant="tonal" rounded="lg">
                <v-icon icon="mdi-lightbulb-outline" />
              </v-avatar>
            </template>
            <template #append>
              <strong class="text-body-2">{{ formatMoney(product.amount) }}</strong>
            </template>
          </v-list-item>
        </v-list>
        <v-alert v-else type="info" variant="tonal" density="compact" class="mt-4">
          {{ props.reportError
            ? 'Top products are unavailable.'
            : 'No completed sales this week.' }}
        </v-alert>
      </v-card>
    </v-col>
  </v-row>
</template>
