/**
 * The type a resource names — JSON:API's resource type, Spatie's model — for
 * the drivers that key sparse fieldsets by it.
 *
 * A single segment is its own type, whatever slashes surround it. A nested
 * resource gives none: `users/42/followers` returns `users`, and `users/me`
 * ends in `me`, so the type cannot be read from the path, and a guess would
 * reject fields the server accepts.
 *
 * @param resource - The resource, as `setResource()` took it
 * @returns The type, or `undefined` for a nested resource
 */
export function getResourceType(resource: string): string | undefined {
  const path = resource.replace(/^\/+|\/+$/g, '');

  return path.includes('/') ? undefined : path;
}
