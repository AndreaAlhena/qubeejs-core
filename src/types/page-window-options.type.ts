/**
 * Options for `getPageWindow()`.
 */
export type PageWindowOptions = {
  /**
   * How many pages to show at each end: a whole number, `0` or more. `1` when left out.
   */
  boundaries?: number;

  /**
   * How many pages to show either side of the current one: a whole number, `0` or more.
   * `1` when left out.
   */
  siblings?: number;
};
