/**
 * Options for `integerParam()`.
 */
export type IntegerParamOptions = {
  /**
   * The value used when the key is absent or unreadable. Without one, the
   * param's value is `number | undefined`.
   */
  default?: number;

  /**
   * The largest value accepted; a larger one falls back.
   */
  max?: number;

  /**
   * The smallest value accepted; a smaller one falls back.
   */
  min?: number;
};
