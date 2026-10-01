/**
 * The values an enum-like param accepts: a string enum object, or a tuple of
 * strings. Numeric enums are refused — their objects carry reverse mappings.
 *
 * @typeParam T - The accepted values
 */
export type EnumValues<T extends string> = Readonly<Record<string, T>> | readonly T[];
