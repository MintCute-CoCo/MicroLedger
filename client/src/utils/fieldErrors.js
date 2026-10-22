export function fieldErrorsFrom(error, fieldMap = {}) {
  const details = Array.isArray(error?.details)
    ? error.details
    : error?.details && typeof error.details === 'object'
      ? [error.details]
      : [];
  const fields = {};
  const globalMessages = [];
  const codeField = { SKU_DUPLICATE: 'sku', CATEGORY_EXISTS: 'name', CUSTOMER_PHONE_DUPLICATE: 'phone', CATEGORY_NAME_DUPLICATE: 'name', SUPPLIER_DUPLICATE: 'name', USERNAME_EXISTS: 'username', AUTH_INVALID_CREDENTIALS: 'currentPassword' }[error?.code];
  if (codeField && error?.message) {
    const key = Object.entries(fieldMap).find(([, value]) => value === codeField)?.[0] || codeField;
    fields[key] = [error.message];
  }

  for (const detail of details) {
    const sourceField = detail?.field || (Array.isArray(detail?.path) ? detail.path.join('.') : '');
    const field = fieldMap[sourceField] || sourceField;
    if (field && typeof detail?.message === 'string') {
      fields[field] = [...(fields[field] || []), detail.message];
    } else if (typeof detail?.message === 'string') {
      globalMessages.push(detail.message);
    }
  }

  return { fields, globalMessage: globalMessages[0] || error?.message || 'The request could not be completed.' };
}
