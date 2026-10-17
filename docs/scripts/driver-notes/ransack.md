## Pagination gems

Ransack filters and sorts; a separate gem paginates, and its headers carry the totals. Both common
ones are read without configuration:

| | Pagy | Kaminari + api-pagination |
| --- | --- | --- |
| Page-size param | `limit` (the default) | `per_page` |
| Headers read | `total-count`, `total-pages`, `current-page`, `page-limit`, `link` | `total`, `per-page`, `link` |
| Last page | `total-pages` | the `rel="last"` link, else total ÷ page size |

Kaminari reads the page size from `per_page`, so rename the parameter once:

```ts
const { builder, paginator } = createQubee({
  driver: RANSACK_DRIVER,
  request: { limit: 'per_page' },
});
```

Pagy ignores a client-supplied `limit` unless the server sets its `client_limit` option. Kaminari on
its own sends no headers at all; pair it with the api-pagination gem. A header renamed on the
server is renamed here through `response`: `{ total: 'x-total' }` reads `x-total` first.

:::caution[Bee aware]
Cross-origin, the browser hides these headers from your code unless the server exposes them. With
rack-cors, in the `allow` block:

```ruby
resource '*', headers: :any, methods: [:get],
  expose: %w[link total-count total-pages current-page page-limit]
```

For api-pagination, expose `link`, `total` and `per-page` instead.
:::

## Attribute names

Conditions and sorts name the model's own attributes, in snake_case: `created_at`, not
`createdAt`. Ransack 4 and later search only what the model allowlists in
`ransackable_attributes` (and `ransackable_associations`, for a condition such as
`author_name_cont`); a condition or sort on any other attribute is ignored.

## Searching across columns

Ransack has no global search parameter; a combinator attribute name searches several columns in one
condition:

```ts
builder.addFilterOperator('title_or_body', FilterOperatorEnum.ILIKE, 'rails');
// q[title_or_body_i_cont]=rails
```

`ILIKE` maps to `_i_cont`. `CONTAINS` maps to `_cont`, which Ransack 6.0 made case-sensitive on
PostgreSQL.
