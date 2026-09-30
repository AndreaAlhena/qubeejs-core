/**
 * Options for `booleanParam()`.
 */
export type BooleanParamOptions = {
  /**
   * The value used when the key is absent or unreadable. Without one, the
   * param's value is `boolean | undefined`.
   */
  default?: boolean;
};
