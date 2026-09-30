/**
 * Options for `getPageWindow()`.
 */
export type PageWindowOptions = {
  /**
   * How many pages to show at each end. `1` when left out.
   */
  boundaries?: number;

  /**
   * How many pages to show either side of the current one. `1` when left out.
   */
  siblings?: number;
};
