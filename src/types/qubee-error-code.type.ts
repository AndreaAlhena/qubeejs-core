/**
 * Machine-readable identifier carried by every {@link QubeeError}.
 *
 * Lets a consumer branch on the failure without parsing English prose:
 *
 * ```typescript
 * if (error instanceof QubeeError && error.code === 'UNSUPPORTED_CAPABILITY') {
 *   // fall back to client-side filtering
 * }
 * ```
 */
export type QubeeErrorCode =
  | 'DUPLICATE_LIST_PARAM'
  | 'INVALID_FILTER_OPERATOR_VALUE'
  | 'INVALID_LIMIT'
  | 'INVALID_PAGE_NUMBER'
  | 'INVALID_RESOURCE_NAME'
  | 'KEY_NOT_FOUND'
  | 'PAGINATION_NOT_SYNCED'
  | 'PARAM_COLLISION'
  | 'UNSELECTABLE_MODEL'
  | 'UNSUPPORTED_CAPABILITY';
