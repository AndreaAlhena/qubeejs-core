import { STRAPI_DRIVER } from '../../src/drivers/strapi.driver';
import { SortEnum } from '../../src/enums/sort.enum';
import { defineList } from '../../src/lists/define-list';
import { enumParam } from '../../src/params/enum-param';
import { integerParam } from '../../src/params/integer-param';
import { sortParam } from '../../src/params/sort-param';
import { stringParam } from '../../src/params/string-param';
import { ArticleStatusEnum } from './article-status.enum';

/**
 * The list the lists specs share: Strapi articles, searchable by title,
 * filterable by status, sortable by publication date or title. The params'
 * order is the order their keys appear in links.
 */
export const articleList = defineList({
  apply: (builder, { q, sort, status }) => {
    builder.setLimit(20);
    sort.forEach(({ field, order }) => builder.addSort(field, order));

    if (q) {
      builder.addFilter('title', q);
    }

    if (status) {
      builder.addFilter('status', status);
    }
  },
  params: {
    page: integerParam('page', { default: 1, min: 1 }),
    q: stringParam('q'),
    status: enumParam('status', ArticleStatusEnum),
    sort: sortParam('sort', {
      default: [{ field: 'publishedAt', order: SortEnum.DESC }],
      fields: ['publishedAt', 'title'],
    }),
  },
  qubee: { driver: STRAPI_DRIVER },
  resource: 'articles',
});
