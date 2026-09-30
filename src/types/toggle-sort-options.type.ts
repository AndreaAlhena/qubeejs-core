/**
 * Options for `toggleSort()`.
 */
export type ToggleSortOptions = {
  /**
   * Keep the other sorts, flipping the field in place or appending it. When
   * left out, the field becomes the only sort.
   */
  multiple?: boolean;
};
