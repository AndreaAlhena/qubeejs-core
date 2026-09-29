import { FilterOperatorEnum } from '../enums/filter-operator.enum';
import { InvalidFilterOperatorValueError } from './invalid-filter-operator-value.error';
import { InvalidLimitError } from './invalid-limit.error';
import { InvalidPageNumberError } from './invalid-page-number.error';
import { InvalidResourceNameError } from './invalid-resource-name.error';
import { KeyNotFoundError } from './key-not-found.error';
import { PaginationNotSyncedError } from './pagination-not-synced.error';
import { ParamCollisionError } from './param-collision.error';
import { QubeeError } from './qubee.error';
import { UnselectableModelError } from './unselectable-model.error';
import { UnsupportedCapabilityError } from './unsupported-capability.error';
import { UnsupportedEmbeddedError } from './unsupported-embedded.error';
import { UnsupportedFieldSelectionError } from './unsupported-field-selection.error';
import { UnsupportedFilterOperatorError } from './unsupported-filter-operator.error';
import { UnsupportedFilterError } from './unsupported-filter.error';
import { UnsupportedIncludesError } from './unsupported-includes.error';
import { UnsupportedSearchError } from './unsupported-search.error';
import { UnsupportedSelectError } from './unsupported-select.error';
import { UnsupportedSortError } from './unsupported-sort.error';

const ALL = [
  [
    'InvalidFilterOperatorValueError',
    new InvalidFilterOperatorValueError(FilterOperatorEnum.BTW, 'needs 2'),
    'INVALID_FILTER_OPERATOR_VALUE',
  ],
  ['InvalidLimitError', new InvalidLimitError(0), 'INVALID_LIMIT'],
  ['InvalidPageNumberError', new InvalidPageNumberError(0), 'INVALID_PAGE_NUMBER'],
  ['InvalidResourceNameError', new InvalidResourceNameError(''), 'INVALID_RESOURCE_NAME'],
  ['KeyNotFoundError', new KeyNotFoundError('id'), 'KEY_NOT_FOUND'],
  [
    'PaginationNotSyncedError',
    new PaginationNotSyncedError('read totalPages'),
    'PAGINATION_NOT_SYNCED',
  ],
  [
    'ParamCollisionError',
    new ParamCollisionError('page', 'page[number]', 'json-api'),
    'PARAM_COLLISION',
  ],
  ['UnselectableModelError', new UnselectableModelError('settings'), 'UNSELECTABLE_MODEL'],
  ['UnsupportedEmbeddedError', new UnsupportedEmbeddedError(), 'UNSUPPORTED_CAPABILITY'],
  [
    'UnsupportedFieldSelectionError',
    new UnsupportedFieldSelectionError(),
    'UNSUPPORTED_CAPABILITY',
  ],
  ['UnsupportedFilterError', new UnsupportedFilterError(), 'UNSUPPORTED_CAPABILITY'],
  [
    'UnsupportedFilterOperatorError',
    new UnsupportedFilterOperatorError(),
    'UNSUPPORTED_CAPABILITY',
  ],
  ['UnsupportedIncludesError', new UnsupportedIncludesError(), 'UNSUPPORTED_CAPABILITY'],
  ['UnsupportedSearchError', new UnsupportedSearchError(), 'UNSUPPORTED_CAPABILITY'],
  ['UnsupportedSelectError', new UnsupportedSelectError(), 'UNSUPPORTED_CAPABILITY'],
  ['UnsupportedSortError', new UnsupportedSortError(), 'UNSUPPORTED_CAPABILITY'],
] as const;

describe('QubeeError', () => {
  describe.each(ALL)('%s', (name, error, code) => {
    it('extends QubeeError and Error', () => {
      expect(error).toBeInstanceOf(QubeeError);
      expect(error).toBeInstanceOf(Error);
    });

    it('sets name to its own class name', () => {
      // KeyNotFoundError and UnselectableModelError previously left this as
      // 'Error', so `err.name` lied about what was thrown.
      expect(error.name).toBe(name);
    });

    it('carries a machine-readable code', () => {
      expect(error.code).toBe(code);
    });

    it('has a non-empty message', () => {
      expect(error.message.length).toBeGreaterThan(0);
    });

    it('is throwable and catchable by class', () => {
      expect(() => {
        throw error;
      }).toThrow(error.constructor);
    });
  });

  describe('cause', () => {
    it('carries an underlying cause when given one', () => {
      class Wrapper extends QubeeError {
        constructor(cause: unknown) {
          super('KEY_NOT_FOUND', 'wrapped', { cause });
        }
      }

      const root = new Error('root');

      expect(new Wrapper(root).cause).toBe(root);
    });

    it('omits cause when none is given', () => {
      expect(new KeyNotFoundError('id').cause).toBeUndefined();
    });
  });

  describe('context', () => {
    it('captures the offending value', () => {
      expect(new InvalidPageNumberError(-3).context).toEqual({ page: -3 });
    });

    it('exposes the offending value as a typed field', () => {
      expect(new InvalidPageNumberError(-3).page).toBe(-3);
      expect(new InvalidLimitError(0).limit).toBe(0);
      expect(new KeyNotFoundError('slug').key).toBe('slug');
    });
  });

  describe('pagination-not-synced message', () => {
    it('points at the Paginator, not an ng-qubee service', () => {
      // Regression for #22: the message told core consumers to call
      // PaginationService.paginate(), which does not exist outside ng-qubee.
      expect(new PaginationNotSyncedError('read totalPages').message).toBe(
        'Cannot read totalPages: no paginated response has been synced yet. Call Paginator.paginate() at least once first.'
      );
    });
  });

  describe('param-collision message', () => {
    it('names both keys, the driver and the way out', () => {
      expect(new ParamCollisionError('page', 'page[number]', 'json-api').message).toBe(
        "The param 'page' collides with 'page[number]', which the 'json-api' driver already emits. Use the builder method that controls it, or remove the param with deleteParams('page')."
      );
    });

    it('falls back to a generic subject when the driver is unknown', () => {
      expect(new ParamCollisionError('limit', 'limit').message).toContain(
        "collides with 'limit', which the active driver already emits."
      );
    });

    it('records the keys and the driver as fields and context', () => {
      const error = new ParamCollisionError('page', 'page[number]', 'json-api');

      expect(error.key).toBe('page');
      expect(error.driverKey).toBe('page[number]');
      expect(error.driver).toBe('json-api');
      expect(error.context).toEqual({ driver: 'json-api', driverKey: 'page[number]', key: 'page' });
    });
  });

  describe('capability messages', () => {
    it('names the driver when known', () => {
      expect(new UnsupportedFilterError('odata').message).toBe(
        "The 'odata' driver does not support filters."
      );
    });

    it('falls back to a generic subject when the driver is unknown', () => {
      expect(new UnsupportedFilterError().message).toBe(
        'The active driver does not support filters.'
      );
    });

    it('records the capability and driver as fields', () => {
      const error = new UnsupportedSortError('json-server');

      expect(error.capability).toBe('sort');
      expect(error.driver).toBe('json-server');
    });

    it('shares one code across every capability error', () => {
      const capabilityErrors = ALL.filter(([, e]) => e instanceof UnsupportedCapabilityError);

      expect(capabilityErrors).toHaveLength(8);
      capabilityErrors.forEach(([, e]) => expect(e.code).toBe('UNSUPPORTED_CAPABILITY'));
    });

    it('never hardcodes a driver list in the message', () => {
      // Regression for #8: every previous message named specific drivers and
      // all eight had become factually wrong as drivers gained features.
      ALL.filter(([, e]) => e instanceof UnsupportedCapabilityError).forEach(([, e]) => {
        expect(e.message).not.toMatch(/only supported by/i);
        expect(e.message).not.toMatch(/Spatie|NestJS|PostgREST/);
      });
    });
  });
});
