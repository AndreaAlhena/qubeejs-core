import { getResourceType } from './get-resource-type';

describe('getResourceType', () => {
  it('should read the type of a single-segment resource', () => {
    expect(getResourceType('articles')).toBe('articles');
  });

  it('should ignore slashes around a single segment', () => {
    expect(getResourceType('/articles')).toBe('articles');
    expect(getResourceType('articles/')).toBe('articles');
    expect(getResourceType('//articles//')).toBe('articles');
  });

  it('should not guess the type of a nested resource', () => {
    // `users/42/followers` returns `users`, and `users/me` ends in `me`.
    expect(getResourceType('users/42/followers')).toBeUndefined();
    expect(getResourceType('users/me')).toBeUndefined();
    expect(getResourceType('/projects/42/tasks/')).toBeUndefined();
  });
});
