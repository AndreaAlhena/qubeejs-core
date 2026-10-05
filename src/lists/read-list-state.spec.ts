import { articleList } from '../../test/fixtures/article-list';
import { ArticleStatusEnum } from '../../test/fixtures/article-status.enum';
import { taskList } from '../../test/fixtures/task-list';
import { STRAPI_DRIVER } from '../drivers/strapi.driver';
import { SortEnum } from '../enums/sort.enum';
import { integerParam } from '../params/integer-param';
import { defineList } from './define-list';
import { readListState } from './read-list-state';

describe('readListState', () => {
  it('should read every param', () => {
    expect(
      readListState(articleList, '?q=react&status=published&sort=-publishedAt,title&page=2')
    ).toEqual({
      page: 2,
      q: 'react',
      sort: [
        { field: 'publishedAt', order: SortEnum.DESC },
        { field: 'title', order: SortEnum.ASC },
      ],
      status: ArticleStatusEnum.PUBLISHED,
    });
  });

  it('should use the defaults for an empty query', () => {
    expect(readListState(articleList, '')).toEqual({
      page: 1,
      q: undefined,
      sort: [{ field: 'publishedAt', order: SortEnum.DESC }],
      status: undefined,
    });
  });

  it('should fall back on unreadable values', () => {
    expect(readListState(articleList, '?page=0&status=archived&sort=views')).toEqual(
      readListState(articleList, '')
    );
  });

  it.each(['?page=99999999999999999999', '?page=1e3', '?page=%2B2', '?page=2&page=3'])(
    'should fall back on a hand-edited page: %s',
    (search) => {
      expect(readListState(articleList, search).page).toBe(1);
    }
  );

  it('should ignore keys the list does not own', () => {
    expect(readListState(articleList, '?panel=new')).toEqual(readListState(articleList, ''));
  });

  it('should read every input shape alike', () => {
    const fromString = readListState(articleList, '?page=2&q=react');

    expect(readListState(articleList, new URLSearchParams('page=2&q=react'))).toEqual(fromString);
    expect(readListState(articleList, { page: '2', q: 'react' })).toEqual(fromString);
  });

  it('should fall back when a record holds several values for a scalar', () => {
    expect(readListState(articleList, { page: ['2', '3'] }).page).toBe(1);
  });

  it('should fall back when a custom param throws or returns null', () => {
    const list = defineList({
      params: {
        missing: {
          default: 'never',
          key: 'missing',
          parse: (): string | undefined => null as unknown as undefined,
          serialize: (value: string): readonly string[] => [value],
        },
        page: integerParam('page', { default: 1 }),
        since: {
          default: 'always',
          key: 'since',
          parse: (): string => {
            throw new Error('unreadable');
          },
          serialize: (value: string): readonly string[] => [value],
        },
      },
      qubee: { driver: STRAPI_DRIVER },
      resource: 'articles',
    });

    const state = readListState(list, '?since=yesterday&missing=x');

    expect([state.since, state.missing]).toEqual(['always', 'never']);
  });

  it('should leave a URLSearchParams it is given untouched', () => {
    const search = new URLSearchParams('page=2');

    readListState(articleList, search);

    expect(search.toString()).toBe('page=2');
  });

  it('should read a list with an input like any other', () => {
    expect(readListState(taskList, '?status=open&page=2')).toEqual({ page: 2, status: 'open' });
  });

  it('should never read the input from the query', () => {
    expect(readListState(taskList, '?projectId=99')).toEqual({ page: 1, status: undefined });
  });
});
