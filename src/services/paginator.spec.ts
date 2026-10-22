import { JsonApiResponseOptions, NestjsResponseOptions } from '../models/response-options';
import { JsonApiResponseStrategy } from '../strategies/json-api-response.strategy';
import { LaravelResponseStrategy } from '../strategies/laravel-response.strategy';
import { NestjsResponseStrategy } from '../strategies/nestjs-response.strategy';
import { PostgrestResponseStrategy } from '../strategies/postgrest-response.strategy';
import { SpatieResponseStrategy } from '../strategies/spatie-response.strategy';
import { Paginator } from './paginator';
import { QubeeStore } from './qubee-store';

describe('Paginator (Spatie)', () => {
  let paginator: Paginator;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    paginator = new Paginator(store, new SpatieResponseStrategy());
  });

  it('should be created', () => {
    expect(paginator).toBeTruthy();
  });

  it('should paginate with minimum required data (data and current_page fields)', () => {
    const collection = paginator.paginate({
      data: [],

      current_page: 1,
    });

    expect(collection.data).toHaveLength(0);
    expect(collection.page).toBe(1);
  });

  it('should paginate', () => {
    const collection = paginator.paginate({
      data: [{}],
      current_page: 1,
      first_page_url: 'http://domain.com?page=1',
      from: 1,
      last_page: 2,
      last_page_url: 'http://domain.com?page=2',
      next_page_url: 'http://domain.com?page=2',
      path: 'http://domain.com',
      per_page: 15,
      prev_page_url: null,
      to: 15,
      total: 30,
    });

    expect(collection.data).toHaveLength(1);
    expect(collection.page).toBe(1);
    expect(collection.firstPageUrl).toBe('http://domain.com?page=1');
    expect(collection.from).toBe(1);
    expect(collection.lastPage).toBe(2);
    expect(collection.lastPageUrl).toBe('http://domain.com?page=2');
    expect(collection.nextPageUrl).toBe('http://domain.com?page=2');
    expect(collection.perPage).toBe(15);
    expect(collection.prevPageUrl).toBeFalsy();
    expect(collection.to).toBe(15);
    expect(collection.total).toBe(30);
    expect(collection.page).toBe(1);
  });
});

describe('Paginator (Laravel)', () => {
  let paginator: Paginator;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    paginator = new Paginator(store, new LaravelResponseStrategy());
  });

  it('should be created', () => {
    expect(paginator).toBeTruthy();
  });

  it('should paginate with minimum required data (data and current_page fields)', () => {
    const collection = paginator.paginate({
      data: [],

      current_page: 1,
    });

    expect(collection.data).toHaveLength(0);
    expect(collection.page).toBe(1);
  });

  it('should paginate', () => {
    const collection = paginator.paginate({
      data: [{}],
      current_page: 1,
      first_page_url: 'http://domain.com?page=1',
      from: 1,
      last_page: 2,
      last_page_url: 'http://domain.com?page=2',
      next_page_url: 'http://domain.com?page=2',
      path: 'http://domain.com',
      per_page: 15,
      prev_page_url: null,
      to: 15,
      total: 30,
    });

    expect(collection.data).toHaveLength(1);
    expect(collection.page).toBe(1);
    expect(collection.firstPageUrl).toBe('http://domain.com?page=1');
    expect(collection.from).toBe(1);
    expect(collection.lastPage).toBe(2);
    expect(collection.lastPageUrl).toBe('http://domain.com?page=2');
    expect(collection.nextPageUrl).toBe('http://domain.com?page=2');
    expect(collection.perPage).toBe(15);
    expect(collection.prevPageUrl).toBeFalsy();
    expect(collection.to).toBe(15);
    expect(collection.total).toBe(30);
    expect(collection.page).toBe(1);
  });
});

describe('Paginator (NestJS)', () => {
  let paginator: Paginator;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    paginator = new Paginator(store, new NestjsResponseStrategy(), new NestjsResponseOptions({}));
  });

  it('should be created', () => {
    expect(paginator).toBeTruthy();
  });

  it('should paginate a NestJS response with minimum required data', () => {
    const collection = paginator.paginate({
      data: [],
      meta: { currentPage: 1 },
    });

    expect(collection.data).toHaveLength(0);
    expect(collection.page).toBe(1);
  });

  it('should paginate a full NestJS response', () => {
    const collection = paginator.paginate({
      data: [{ id: 1, name: 'Test' }],
      meta: {
        currentPage: 2,
        totalItems: 50,
        itemsPerPage: 10,
        totalPages: 5,
      },
      links: {
        first: 'http://api.com/users?page=1',
        previous: 'http://api.com/users?page=1',
        next: 'http://api.com/users?page=3',
        last: 'http://api.com/users?page=5',
        current: 'http://api.com/users?page=2',
      },
    });

    expect(collection.data).toHaveLength(1);
    expect(collection.page).toBe(2);
    expect(collection.total).toBe(50);
    expect(collection.perPage).toBe(10);
    expect(collection.lastPage).toBe(5);
    expect(collection.firstPageUrl).toBe('http://api.com/users?page=1');
    expect(collection.prevPageUrl).toBe('http://api.com/users?page=1');
    expect(collection.nextPageUrl).toBe('http://api.com/users?page=3');
    expect(collection.lastPageUrl).toBe('http://api.com/users?page=5');
  });

  it('should compute from and to values when not present in response', () => {
    const collection = paginator.paginate({
      data: [{ id: 1 }],
      meta: {
        currentPage: 3,
        totalItems: 100,
        itemsPerPage: 10,
        totalPages: 10,
      },
      links: {},
    });

    expect(collection.from).toBe(21);
    expect(collection.to).toBe(30);
  });

  it('should handle last page where to does not exceed total', () => {
    const collection = paginator.paginate({
      data: [{ id: 1 }],
      meta: {
        currentPage: 4,
        totalItems: 35,
        itemsPerPage: 10,
        totalPages: 4,
      },
      links: {},
    });

    expect(collection.from).toBe(31);
    expect(collection.to).toBe(35);
  });

  it('should handle response with null link values', () => {
    const collection = paginator.paginate({
      data: [],
      meta: {
        currentPage: 1,
        totalItems: 5,
        itemsPerPage: 10,
        totalPages: 1,
      },
      links: {
        first: 'http://api.com/users?page=1',
        previous: null,
        next: null,
        last: 'http://api.com/users?page=1',
      },
    });

    expect(collection.prevPageUrl).toBeNull();
    expect(collection.nextPageUrl).toBeNull();
    expect(collection.firstPageUrl).toBe('http://api.com/users?page=1');
    expect(collection.lastPageUrl).toBe('http://api.com/users?page=1');
  });
});

// Auto-sync contract: paginate() writes state.page and flips isLastPageKnown
// when the response carries a positive lastPage. Exercised across all four
// driver response strategies so the behavior is portable.
describe('Paginator auto-sync (Spatie)', () => {
  let paginator: Paginator;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    paginator = new Paginator(store, new SpatieResponseStrategy());
  });

  it('should sync page and lastPage after a paginated response', () => {
    paginator.paginate({
      data: [{}],
      current_page: 3,
      last_page: 7,
    });

    const state = store.getSnapshot();
    expect(state.page).toBe(3);
    expect(state.lastPage).toBe(7);
    expect(state.isLastPageKnown).toBe(true);
  });

  it('should leave isLastPageKnown false when server emits lastPage 0 (empty collection)', () => {
    paginator.paginate({
      data: [],
      current_page: 1,
      last_page: 0,
    });

    const state = store.getSnapshot();
    expect(state.page).toBe(1);
    expect(state.isLastPageKnown).toBe(false);
  });

  it('should leave isLastPageKnown false when last_page is absent', () => {
    paginator.paginate({
      data: [{}],
      current_page: 2,
    });

    const state = store.getSnapshot();
    expect(state.page).toBe(2);
    expect(state.isLastPageKnown).toBe(false);
  });
});

describe('Paginator auto-sync (Laravel)', () => {
  let paginator: Paginator;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    paginator = new Paginator(store, new LaravelResponseStrategy());
  });

  it('should sync page and lastPage after a paginated response', () => {
    paginator.paginate({
      data: [{}],
      current_page: 4,
      last_page: 10,
    });

    const state = store.getSnapshot();
    expect(state.page).toBe(4);
    expect(state.lastPage).toBe(10);
    expect(state.isLastPageKnown).toBe(true);
  });
});

describe('Paginator auto-sync (NestJS)', () => {
  let paginator: Paginator;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    paginator = new Paginator(store, new NestjsResponseStrategy(), new NestjsResponseOptions({}));
  });

  it('should sync page and lastPage after a paginated response', () => {
    paginator.paginate({
      data: [{}],
      meta: {
        currentPage: 2,
        totalPages: 5,
        itemsPerPage: 10,
        totalItems: 50,
      },
    });

    const state = store.getSnapshot();
    expect(state.page).toBe(2);
    expect(state.lastPage).toBe(5);
    expect(state.isLastPageKnown).toBe(true);
  });

  it('should leave isLastPageKnown false when totalPages is 0', () => {
    paginator.paginate({
      data: [],
      meta: {
        currentPage: 1,
        totalPages: 0,
        itemsPerPage: 10,
        totalItems: 0,
      },
    });

    const state = store.getSnapshot();
    expect(state.page).toBe(1);
    expect(state.isLastPageKnown).toBe(false);
  });
});

describe('Paginator auto-sync (JSON:API)', () => {
  let paginator: Paginator;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    paginator = new Paginator(store, new JsonApiResponseStrategy(), new JsonApiResponseOptions({}));
  });

  it('should sync page and lastPage after a paginated response', () => {
    paginator.paginate({
      data: [{}],
      meta: {
        'current-page': 3,

        'page-count': 9,
      },
    });

    const state = store.getSnapshot();
    expect(state.page).toBe(3);
    expect(state.lastPage).toBe(9);
    expect(state.isLastPageKnown).toBe(true);
  });
});

describe('Paginator auto-sync (PostgREST)', () => {
  let paginator: Paginator;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    paginator = new Paginator(store, new PostgrestResponseStrategy());
  });

  it('should sync a partial last page at the store limit, not at its span', () => {
    store.limit = 10;
    store.page = 4;

    paginator.paginate([{}, {}, {}, {}], { 'Content-Range': '30-33/34' });

    const state = store.getSnapshot();
    expect(state.page).toBe(4);
    expect(state.lastPage).toBe(4);
    expect(state.isLastPageKnown).toBe(true);
  });
});
