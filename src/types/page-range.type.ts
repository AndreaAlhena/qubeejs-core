/**
 * The numbers behind "21–34 of 34": the first and last row of a page, counted
 * across the whole list, and the list's size.
 */
export type PageRange = {
  /**
   * The first row's position, from 1; `0` for an empty page.
   */
  readonly from: number;

  /**
   * The last row's position; `0` for an empty page.
   */
  readonly to: number;

  /**
   * The number of rows in the whole list, or `null` when the backend does not count.
   */
  readonly total: number | null;
};
