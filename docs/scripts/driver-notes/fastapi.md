## Backend libraries

FastAPI has no list conventions of its own. This driver speaks the two libraries most list
endpoints use: [fastapi-filter](https://github.com/arthurio/fastapi-filter) reads the query, with
its SQLAlchemy backend, and [fastapi-pagination](https://github.com/uriyyo/fastapi-pagination)'s
`Page` shapes the response.

FastAPI ignores a query parameter nothing declares, so a condition the server does not expect is
dropped without an error. For this driver's queries to take effect, the endpoint needs:

- **One `Filter` field per condition the client sends.** One value is sent as `status=…` and
  several as `status__in=…`, so these are two fields. An operator adds its suffix: `views__gte`,
  `title__ilike`.
- **An `order_by` field** for sorting. It takes effect when the endpoint passes its query through
  the filter's `.sort()`, as conditions do through `.filter()`.
- **A `search` field** for search, with `search_model_fields` naming the columns it matches with
  `ilike`. Without them, a search is a server error.
- **`Page` as the response model**, or `fastapi_pagination.links.Page` for the navigation URLs,
  with `add_pagination(app)` on the application.

## Names and values

Conditions and sorts name the model's own attributes, in snake_case: `created_at`, not
`createdAt`. Sorting on a field the model does not have is a 422, and so is naming a field twice, so
the driver sends a repeated sort field once, with its first direction. A condition on a related
model's field carries its prefix, `author__name`, when the `Filter` nests one with
`with_prefix('author', …)`. Sorts cannot reach a related model.

`CONTAINS`, `ILIKE` and `SW` are sent as `like`/`ilike` patterns: `title__ilike=%rails%`. A `%` or
`_` inside the value is a wildcard too, since fastapi-filter has no escape. `CONTAINS` is
case-sensitive on PostgreSQL; use `ILIKE` to ignore case. Several values travel as one
comma-separated parameter, so a value that itself holds a comma is split in two.

:::caution[Bee aware]
`Page` caps `size` at 100, and a larger page size is answered with a 422, not trimmed. Raise the cap
on the server with `CustomizedPage[Page[T], UseParamsFields(size=Query(50, ge=1, le=500))]`.
:::

## Page variants

| On the server | Here |
| --- | --- |
| `Page`, `fastapi_pagination.links.Page` | read without configuration; the `links` block fills the navigation URLs |
| `UseIncludeTotal(False)` | the `null` total and page count read as unknown; `links.last`, which then always points at page 1, is dropped, and `links.next` is always `null` |
| `UseFieldsAliases(items="content")` | `response: { data: 'content' }` |
| `page` renamed through `UseParamsFields` | `request: { page: 'p' }`; `size` is fixed |
| `LimitOffsetPage`, `CursorPage` | not supported |

An empty result reports one last page and no `from`/`to`, so a page count from an earlier, wider
query does not linger.

## Other fastapi-filter backends

The driver targets the SQLAlchemy backend. On the Beanie backend, `NOT` works, but `like` and
`ilike` become a regular expression that keeps the `%` as a literal character, so `CONTAINS`,
`ILIKE` and `SW` match nothing. The MongoEngine backend passes operators straight to MongoEngine,
which has no `neq`, `not_in`, `like` or `ilike`, so `NOT`, `CONTAINS`, `ILIKE` and `SW` fail there.
