import {
  ApiPlatformResponseOptions,
  DirectusResponseOptions,
  DrfResponseOptions,
  FastapiResponseOptions,
  FeathersResponseOptions,
  JsonApiResponseOptions,
  JsonServerResponseOptions,
  NestjsResponseOptions,
  NestjsxCrudResponseOptions,
  OdataResponseOptions,
  PayloadResponseOptions,
  PocketbaseResponseOptions,
  RansackResponseOptions,
  ResponseOptions,
  SieveResponseOptions,
  SpringResponseOptions,
  StrapiResponseOptions,
} from './response-options';

const SUBCLASSES = [
  ['ApiPlatform', ApiPlatformResponseOptions],
  ['Directus', DirectusResponseOptions],
  ['Drf', DrfResponseOptions],
  ['Fastapi', FastapiResponseOptions],
  ['Feathers', FeathersResponseOptions],
  ['JsonApi', JsonApiResponseOptions],
  ['JsonServer', JsonServerResponseOptions],
  ['Nestjs', NestjsResponseOptions],
  ['NestjsxCrud', NestjsxCrudResponseOptions],
  ['Odata', OdataResponseOptions],
  ['Payload', PayloadResponseOptions],
  ['Pocketbase', PocketbaseResponseOptions],
  ['Ransack', RansackResponseOptions],
  ['Sieve', SieveResponseOptions],
  ['Spring', SpringResponseOptions],
  ['Strapi', StrapiResponseOptions],
] as const;

const KEYS = [
  'currentPage',
  'data',
  'firstPageUrl',
  'from',
  'lastPage',
  'lastPageUrl',
  'nextPageUrl',
  'path',
  'perPage',
  'prevPageUrl',
  'to',
  'total',
] as const;

describe('ResponseOptions', () => {
  describe('base defaults', () => {
    it('falls back to the Laravel envelope', () => {
      expect({ ...new ResponseOptions({}) }).toEqual({
        currentPage: 'current_page',
        data: 'data',
        firstPageUrl: 'first_page_url',
        from: 'from',
        lastPage: 'last_page',
        lastPageUrl: 'last_page_url',
        nextPageUrl: 'next_page_url',
        path: 'path',
        perPage: 'per_page',
        prevPageUrl: 'prev_page_url',
        to: 'to',
        total: 'total',
      });
    });

    it('honours every caller-supplied key', () => {
      const custom = Object.fromEntries(KEYS.map((k) => [k, `custom.${k}`]));

      expect({ ...new ResponseOptions(custom) }).toEqual(custom);
    });

    it('exposes every key as readonly', () => {
      const options = new ResponseOptions({});

      KEYS.forEach((key) => {
        expect(typeof options[key]).toBe('string');
      });
    });
  });

  describe.each(SUBCLASSES)('%s', (_name, Options) => {
    it('is a ResponseOptions', () => {
      expect(new Options({})).toBeInstanceOf(ResponseOptions);
    });

    it('lets the caller override every key', () => {
      const custom = Object.fromEntries(KEYS.map((k) => [k, `custom.${k}`]));

      expect({ ...new Options(custom) }).toEqual(custom);
    });

    it('resolves every key to a string', () => {
      const options = new Options({});

      KEYS.forEach((key) => {
        expect(typeof options[key]).toBe('string');
      });
    });
  });

  // Regression for #9. The base used `||`, so a subclass passing '' to mean
  // "this driver derives the field" had its intent silently replaced by the
  // Laravel default. '' is a meaningful value here and must survive.
  describe('empty-string intent (#9)', () => {
    it('keeps an explicitly empty key empty', () => {
      expect(new ResponseOptions({ currentPage: '' }).currentPage).toBe('');
    });

    it('still falls back when a key is absent', () => {
      expect(new ResponseOptions({}).currentPage).toBe('current_page');
    });

    it('still falls back when a key is explicitly undefined', () => {
      expect(new ResponseOptions({ currentPage: undefined }).currentPage).toBe('current_page');
    });

    it('honours a subclass that derives fields from URLs rather than the body', () => {
      const options = new ApiPlatformResponseOptions({});

      // Documented behaviour: these have no body field and are derived from
      // the Hydra view URLs instead.
      expect(options.currentPage).toBe('');
      expect(options.lastPage).toBe('');
      expect(options.perPage).toBe('');
    });

    it('lets a caller override a derived field on a subclass', () => {
      expect(new ApiPlatformResponseOptions({ currentPage: 'meta.page' }).currentPage).toBe(
        'meta.page'
      );
    });
  });

  // Characterisation: the exact resolved defaults, per driver, before the
  // `||` -> `??` fix. Any change here is a wire-format change and must be
  // deliberate — see #9.
  describe('resolved defaults per driver', () => {
    it.each(SUBCLASSES)('%s', (_name, Options) => {
      expect({ ...new Options({}) }).toMatchSnapshot();
    });
  });
});
