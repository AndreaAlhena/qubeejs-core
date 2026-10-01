/**
 * Options for `enumParam()`.
 *
 * @typeParam T - The accepted values
 */
export type EnumParamOptions<T extends string> = {
  /**
   * The value used when the key is absent or holds anything else. Without
   * one, the param's value is `T | undefined`.
   */
  default?: T;
};
