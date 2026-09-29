/**
 * Extra query parameters — ones no driver models — keyed by parameter name.
 *
 * Set through `QueryBuilder.setParam()` and appended by
 * `QueryBuilder.generateUri()` after the driver's own parameters. Each key is
 * emitted verbatim; its values are percent-encoded one by one, then joined
 * with a literal `,`:
 *
 * ```
 * { status: ['failed'], ids: ['a,b', 'c'] } -> status=failed&ids=a%2Cb,c
 * ```
 */
export type Params = {
  [key: string]: (string | number | boolean)[];
};
