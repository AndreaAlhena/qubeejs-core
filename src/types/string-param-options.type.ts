/**
 * Options for `stringParam()`.
 */
export type StringParamOptions = {
  /**
   * The value used when the key is absent or empty. Without one, the param's
   * value is `string | undefined`.
   */
  default?: string;

  /**
   * Trim surrounding whitespace when reading. Off by default: a search box
   * whose value is read back from list state would lose the space its user
   * has just typed. Turn it on for lists read only on the server, or trim in
   * the list's `apply`.
   */
  trim?: boolean;
};
