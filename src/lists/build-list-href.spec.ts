import type { ListLocation } from '../types/list-location.type';
import type { SearchParamsInput } from '../types/search-params-input.type';

import { articleList } from '../../test/fixtures/article-list';
import { ArticleStatusEnum } from '../../test/fixtures/article-status.enum';
import { taskList } from '../../test/fixtures/task-list';
import { SortEnum } from '../enums/sort.enum';
import { buildListHref } from './build-list-href';
import { readListState } from './read-list-state';

const at = (search: SearchParamsInput): ListLocation => ({ pathname: '/articles', search });

describe('buildListHref', () => {
  it('should write the canonical order of a hand-edited query', () => {
    expect(buildListHref(articleList, at('?q=react&page=3'))).toBe('/articles?page=3&q=react');
  });

  it('should return the bare path for the default state', () => {
    expect(buildListHref(articleList, at(''))).toBe('/articles');
  });

  it('should write a changed page', () => {
    expect(buildListHref(articleList, at(''), { page: 3 })).toBe('/articles?page=3');
  });

  describe('page', () => {
    it('should return to page 1 when another param changes', () => {
      expect(buildListHref(articleList, at('?page=3'), { q: 'react' })).toBe('/articles?q=react');
    });

    it('should keep the page when a param is set to its current value', () => {
      expect(
        buildListHref(articleList, at('?page=3&status=draft'), { status: ArticleStatusEnum.DRAFT })
      ).toBe('/articles?page=3&status=draft');
    });

    it('should reset the page when a param changes value', () => {
      expect(
        buildListHref(articleList, at('?status=draft&page=3'), {
          status: ArticleStatusEnum.PUBLISHED,
        })
      ).toBe('/articles?status=published');
    });

    it('should let an explicit page win', () => {
      expect(buildListHref(articleList, at('?page=3'), { page: 5, q: 'x' })).toBe(
        '/articles?page=5&q=x'
      );
    });
  });

  describe('defaults', () => {
    it('should treat undefined as the default', () => {
      expect(buildListHref(articleList, at('?q=react&page=2'), { q: undefined })).toBe('/articles');
      expect(buildListHref(articleList, at('?page=4'), { page: undefined })).toBe('/articles');
    });

    it('should leave out values equal to their default', () => {
      expect(
        buildListHref(articleList, at('?sort=title'), {
          sort: [{ field: 'publishedAt', order: SortEnum.DESC }],
        })
      ).toBe('/articles');
    });

    it('should drop unreadable values in the current URL', () => {
      expect(buildListHref(articleList, at('?page=abc&status=nope&sort=views'))).toBe('/articles');
    });
  });

  it('should write sorts with readable commas', () => {
    expect(
      buildListHref(articleList, at(''), {
        sort: [
          { field: 'title', order: SortEnum.ASC },
          { field: 'publishedAt', order: SortEnum.DESC },
        ],
      })
    ).toBe('/articles?sort=title,-publishedAt');
  });

  describe('foreign keys', () => {
    it('should keep keys the list does not own', () => {
      expect(buildListHref(articleList, at('?panel=new&q=old&page=2'), { page: 3 })).toBe(
        '/articles?panel=new&page=3&q=old'
      );
    });

    it('should put them first, in their own order', () => {
      expect(buildListHref(articleList, at('?page=2&panel=new&x=1'), { q: 'a' })).toBe(
        '/articles?panel=new&x=1&q=a'
      );
    });

    it('should keep repeated foreign keys from a record', () => {
      expect(buildListHref(articleList, at({ page: '2', tag: ['a', 'b'] }))).toBe(
        '/articles?tag=a&tag=b&page=2'
      );
    });
  });

  it('should use the pathname it is given', () => {
    expect(
      buildListHref(articleList, { pathname: '/blog/articles', search: '' }, { page: 2 })
    ).toBe('/blog/articles?page=2');
  });

  it('should leave a URLSearchParams it is given untouched', () => {
    const search = new URLSearchParams('page=2');

    buildListHref(articleList, at(search), { page: 3 });

    expect(search.toString()).toBe('page=2');
  });

  it.each(['rock & roll', '#1 hit', '100%', 'a+b', 'a, b', '  padded  '])(
    'should round-trip %j through the URL',
    (q) => {
      const href = buildListHref(articleList, at(''), { q });

      expect(readListState(articleList, href.slice(href.indexOf('?'))).q).toBe(q);
    }
  );

  describe('a list with an input', () => {
    const tasksAt = (search: SearchParamsInput): ListLocation => ({
      pathname: '/projects/42/tasks',
      search,
    });

    it('should write only params, never the input', () => {
      expect(buildListHref(taskList, tasksAt('?page=3'), { status: 'open' })).toBe(
        '/projects/42/tasks?status=open'
      );
    });

    it('should refuse the input as a change', () => {
      // @ts-expect-error — the input is not a param, so it cannot go into a link
      expect(buildListHref(taskList, tasksAt(''), { projectId: '7' })).toBe('/projects/42/tasks');
    });
  });
});
