import { QubeeError } from './qubee.error';

/**
 * Thrown by `defineList()` when two params share a page-URL key, or when a
 * param's key is empty.
 *
 * Two params reading one key would fight over it — every link would write the
 * key twice — so the list is refused where it is declared, at module load,
 * rather than misbehaving later.
 */
export class DuplicateListParamError extends QubeeError {
  /**
   * The contested key — `''` when the problem is an empty key.
   */
  public readonly key: string;

  /**
   * The state names of the params holding `key`.
   */
  public readonly names: readonly string[];

  /**
   * @param key - The contested key, or `''`
   * @param names - The state names of the params holding it
   */
  constructor(key: string, names: readonly string[]) {
    const subject = names.map((name) => `'${name}'`).join(' and ');

    super(
      'DUPLICATE_LIST_PARAM',
      key === ''
        ? `Give ${subject} a page-URL key: an empty key cannot be read from a URL.`
        : `The list params ${subject} share the key '${key}'. Give each param a key of its own.`,
      { context: { key, names } }
    );

    this.key = key;
    this.names = names;
  }
}
