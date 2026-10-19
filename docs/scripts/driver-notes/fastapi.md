## Backend libraries

FastAPI has no list conventions of its own. This driver speaks the two libraries most list
endpoints use: [fastapi-filter](https://github.com/arthurio/fastapi-filter) reads the query, with
its SQLAlchemy backend, and [fastapi-pagination](https://github.com/uriyyo/fastapi-pagination)'s
`Page` shapes the response.

```py
from fastapi_filter import FilterDepends
from fastapi_filter.contrib.sqlalchemy import Filter
from fastapi_pagination import Page, add_pagination
from fastapi_pagination.ext.sqlalchemy import paginate

class ArticleFilter(Filter):
    status: str | None = None
    status__in: list[str] | None = None
    views__gte: int | None = None
    title__ilike: str | None = None
    order_by: list[str] | None = None
    search: str | None = None

    class Constants(Filter.Constants):
        model = Article
        search_model_fields = ["title", "body"]

@app.get("/articles", response_model=Page[ArticleOut])
def list_articles(articles: ArticleFilter = FilterDepends(ArticleFilter), db: Session = Depends(get_db)):
    return paginate(db, articles.sort(articles.filter(select(Article))))

add_pagination(app)
```

Every condition the client sends must be a field of the `Filter`. FastAPI ignores a query parameter
nothing declares, so an undeclared condition is dropped without an error. `status` and
`status__in` are two fields: one value is sent as `status=…`, several as `status__in=…`.

## Names and values

Conditions and sorts name the model's own attributes, in snake_case: `created_at`, not
`createdAt`. Sorting on a field the model does not have is a 422. A related model's field carries
its prefix, `author__name`, when the `Filter` nests one with `with_prefix('author', …)`.

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
| `UseIncludeTotal(False)` | the `null` total and page count read as unknown |
| `UseFieldsAliases(items="content")` | `response: { data: 'content' }` |
| `page` renamed through `UseParamsFields` | `request: { page: 'p' }`; `size` is fixed |
| `LimitOffsetPage`, `CursorPage` | not supported |

The MongoEngine and Beanie backends of fastapi-filter handle `neq` and `like` differently from
SQLAlchemy, so `NOT`, `CONTAINS`, `ILIKE` and `SW` are only reliable on the SQLAlchemy backend.
