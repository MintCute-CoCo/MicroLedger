<script setup>
import ImportPreviewSection from '../components/imports/ImportPreviewSection.vue';
import ImportSetupSection from '../components/imports/ImportSetupSection.vue';
import { useImports } from '../composables/imports/useImports.js';

const {
  file,
  preview,
  busy,
  mode,
  error,
  done,
  tableHeaders,
  formatIssues,
  totalPreviewPages,
  template,
  upload,
  pagePreview,
  errorsFile,
  commit,
} = useImports();
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6">
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">CATALOG</div>
        <h1 class="text-h5 font-weight-bold">Import products</h1>
        <p class="text-body-2 text-medium-emphasis">
          Preview a spreadsheet before applying any product changes.
        </p>
      </div>
    </div>

    <ImportSetupSection
      v-model:file="file"
      :busy="busy"
      :error="error"
      :done="done"
      @download-template="template"
      @upload="upload"
    />

    <ImportPreviewSection
      v-model:mode="mode"
      :preview="preview"
      :busy="busy"
      :headers="tableHeaders"
      :total-pages="totalPreviewPages"
      :format-issues="formatIssues"
      @page="pagePreview"
      @download-errors="errorsFile"
      @commit="commit"
    />
  </v-container>
</template>
