import { FilterOperatorEnum } from '../enums/filter-operator.enum';
import { SortEnum } from '../enums/sort.enum';
import { InvalidPageNumberError } from '../errors/invalid-page-number.error';
import { InvalidResourceNameError } from '../errors/invalid-resource-name.error';
import { QubeeStore } from './qubee-store';

describe('QubeeStore', () => {
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('should set base url', () => {
    store.baseUrl = 'https://dummy.domain';
    expect(store.getSnapshot().baseUrl).toBe('https://dummy.domain');
  });

  it('should set limit', () => {
    store.limit = 10;
    expect(store.getSnapshot().limit).toBe(10);
  });

  it('should set resource', () => {
    store.resource = 'users';
    expect(store.getSnapshot().resource).toBe('users');
  });

  it('should set page', () => {
    store.page = 1;
    expect(store.getSnapshot().page).toBe(1);
  });

  it('should add fields', () => {
    store.addFields({
      users: ['id', 'username'],
    });

    expect(store.getSnapshot().fields).toEqual({
      users: ['id', 'username'],
    });
  });

  it('should add filters', () => {
    store.addFilters({
      id: [1, 2, 3],
    });

    expect(store.getSnapshot().filters).toEqual({
      id: [1, 2, 3],
    });
  });

  it('should add filters', () => {
    store.addFilters({
      id: [1, 2, 3],
    });

    expect(store.getSnapshot().filters).toEqual({
      id: [1, 2, 3],
    });
  });

  it('should add includes', () => {
    store.addIncludes(['profiles', 'settings']);
    expect(store.getSnapshot().includes).toEqual(['profiles', 'settings']);
  });

  it('should add sort', () => {
    store.addSort({
      field: 'id',
      order: SortEnum.DESC,
    });

    expect(store.getSnapshot().sorts).toEqual([
      {
        field: 'id',
        order: SortEnum.DESC,
      },
    ]);
  });

  it('should delete fields', () => {
    store.addFields({
      users: ['id', 'username'],
    });

    store.deleteFields({
      users: ['username'],
    });

    expect(store.getSnapshot().fields).toEqual({
      users: ['id'],
    });
  });

  it('should delete filters', () => {
    store.addFilters({
      id: [1, 2, 3],
      username: ['dummy'],
    });

    store.deleteFilters('id');

    expect(store.getSnapshot().filters).toEqual({
      username: ['dummy'],
    });
  });

  it('should delete includes', () => {
    store.addIncludes(['profiles', 'settings']);
    store.deleteIncludes('profiles');

    expect(store.getSnapshot().includes).toEqual(['settings']);
  });

  it('should delete sort', () => {
    store.addSort({
      field: 'id',
      order: SortEnum.DESC,
    });

    store.addSort({
      field: 'username',
      order: SortEnum.ASC,
    });

    store.deleteSorts('id');

    expect(store.getSnapshot().sorts).toEqual([
      {
        field: 'username',
        order: SortEnum.ASC,
      },
    ]);
  });

  it('should reset', () => {
    store.resource = 'dummy';
    store.reset();
    expect(store.getSnapshot().resource).toEqual('');
  });

  describe('params', () => {
    it('should start with no params', () => {
      expect(store.getSnapshot().params).toEqual({});
    });

    it('should set a param', () => {
      store.setParam('status', ['failed']);

      expect(store.getSnapshot().params).toEqual({ status: ['failed'] });
    });

    it('should replace the values of a param that is set again', () => {
      store.setParam('status', ['failed', 'queued']);
      store.setParam('status', ['done']);

      expect(store.getSnapshot().params).toEqual({ status: ['done'] });
    });

    it('should keep a key in its original position when it is set again', () => {
      store.setParam('include', ['author']);
      store.setParam('status', ['failed']);
      store.setParam('include', ['comments']);

      expect(Object.keys(store.getSnapshot().params ?? {})).toEqual(['include', 'status']);
    });

    it('should copy the values rather than keep the caller array', () => {
      const values = ['failed'];

      store.setParam('status', values);
      values.push('queued');

      expect(store.getSnapshot().params).toEqual({ status: ['failed'] });
    });

    it('should leave an earlier snapshot untouched', () => {
      const before = store.getSnapshot();

      store.setParam('status', ['failed']);

      expect(before.params).toEqual({});
    });

    it('should delete the named params only', () => {
      store.setParam('include', ['author']);
      store.setParam('status', ['failed']);
      store.setParam('tag', ['news']);
      store.deleteParams('include', 'tag');

      expect(store.getSnapshot().params).toEqual({ status: ['failed'] });
    });

    it('should ignore deleting a param that is not set', () => {
      store.setParam('status', ['failed']);
      store.deleteParams('include');

      expect(store.getSnapshot().params).toEqual({ status: ['failed'] });
    });

    it('should clear params on reset', () => {
      store.setParam('status', ['failed']);
      store.reset();

      expect(store.getSnapshot().params).toEqual({});
    });
  });

  // Duplicate Prevention Tests
  describe('Duplicate Prevention', () => {
    describe('addEmbedded', () => {
      it('should prevent duplicate columns for the same relation', () => {
        store.addEmbedded({
          author: ['id', 'name'],
        });

        store.addEmbedded({
          author: ['name', 'email'],
        });

        expect(store.getSnapshot().embedded).toEqual({
          author: ['id', 'name', 'email'],
        });
      });

      it('should keep explicit columns when merging an empty column array', () => {
        store.addEmbedded({
          author: ['id', 'name'],
        });

        store.addEmbedded({
          author: [],
        });

        expect(store.getSnapshot().embedded).toEqual({
          author: ['id', 'name'],
        });
      });

      it('should store a relation with no columns as an empty array', () => {
        store.addEmbedded({
          comments: [],
        });

        expect(store.getSnapshot().embedded).toEqual({
          comments: [],
        });
      });

      it('should remove the whole relation via deleteEmbedded', () => {
        store.addEmbedded({
          author: ['id'],
          comments: [],
        });

        store.deleteEmbedded('author');

        expect(store.getSnapshot().embedded).toEqual({
          comments: [],
        });
      });

      it('should ignore deleteEmbedded for an unknown relation', () => {
        store.addEmbedded({
          author: ['id'],
        });

        store.deleteEmbedded('comments');

        expect(store.getSnapshot().embedded).toEqual({
          author: ['id'],
        });
      });

      it('should clear embedded on reset', () => {
        store.addEmbedded({
          author: ['id'],
        });

        store.reset();

        expect(store.getSnapshot().embedded).toEqual({});
      });
    });

    describe('addFields', () => {
      it('should prevent duplicate fields for the same model', () => {
        store.addFields({
          users: ['id', 'username'],
        });

        store.addFields({
          users: ['username', 'email'],
        });

        expect(store.getSnapshot().fields).toEqual({
          users: ['id', 'username', 'email'],
        });
      });

      it('should handle multiple models without duplicates', () => {
        store.addFields({
          users: ['id', 'username'],
          posts: ['title'],
        });

        store.addFields({
          users: ['username', 'email'],
          posts: ['title', 'content'],
        });

        expect(store.getSnapshot().fields).toEqual({
          users: ['id', 'username', 'email'],
          posts: ['title', 'content'],
        });
      });

      it('should not create duplicates when adding the same field multiple times', () => {
        store.addFields({
          users: ['id', 'id', 'id'],
        });

        expect(store.getSnapshot().fields).toEqual({
          users: ['id'],
        });
      });
    });

    describe('addFilters', () => {
      it('should prevent duplicate filter values for the same key', () => {
        store.addFilters({
          id: [1, 2, 3],
        });

        store.addFilters({
          id: [2, 3, 4],
        });

        expect(store.getSnapshot().filters).toEqual({
          id: [1, 2, 3, 4],
        });
      });

      it('should handle multiple filter keys without duplicates', () => {
        store.addFilters({
          id: [1, 2],
          status: ['active'],
        });

        store.addFilters({
          id: [2, 3],
          status: ['active', 'pending'],
        });

        expect(store.getSnapshot().filters).toEqual({
          id: [1, 2, 3],
          status: ['active', 'pending'],
        });
      });

      it('should not create duplicates when adding the same filter value multiple times', () => {
        store.addFilters({
          id: [1, 1, 1],
        });

        expect(store.getSnapshot().filters).toEqual({
          id: [1],
        });
      });
    });

    describe('addIncludes', () => {
      it('should prevent duplicate includes', () => {
        store.addIncludes(['profiles', 'settings']);
        store.addIncludes(['settings', 'posts']);

        expect(store.getSnapshot().includes).toEqual(['profiles', 'settings', 'posts']);
      });

      it('should not create duplicates when adding the same include multiple times', () => {
        store.addIncludes(['profiles', 'profiles', 'profiles']);

        expect(store.getSnapshot().includes).toEqual(['profiles']);
      });

      it('should handle empty arrays', () => {
        store.addIncludes(['profiles']);
        store.addIncludes([]);

        expect(store.getSnapshot().includes).toEqual(['profiles']);
      });
    });
  });

  // Deep Cloning Tests
  describe('Deep Cloning', () => {
    describe('deleteFields', () => {
      it('should not mutate the original state when deleting fields', () => {
        store.addFields({
          users: ['id', 'username', 'email'],
        });

        // Get a reference to the original state
        const originalFields = store.getSnapshot().fields;
        const originalUsersFields = [...originalFields['users']];

        // Delete a field
        store.deleteFields({
          users: ['username'],
        });

        // Verify the original reference hasn't changed
        expect(originalUsersFields).toEqual(['id', 'username', 'email']);

        // Verify the new state is correct
        expect(store.getSnapshot().fields).toEqual({
          users: ['id', 'email'],
        });
      });

      it('should handle deep cloning with multiple models', () => {
        store.addFields({
          users: ['id', 'username'],
          posts: ['title', 'content'],
        });

        const before = store.getSnapshot().fields;

        store.deleteFields({
          users: ['username'],
        });

        // The previously handed-out snapshot must not have been mutated in place
        expect(before['users']).toEqual(['id', 'username']);

        // Original posts should remain unchanged
        expect(store.getSnapshot().fields['posts']).toEqual(['title', 'content']);
        expect(store.getSnapshot().fields['users']).toEqual(['id']);
      });
    });

    describe('deleteFilters', () => {
      it('should not mutate the original state when deleting filters', () => {
        store.addFilters({
          id: [1, 2, 3],
          status: ['active', 'pending'],
        });

        // Get a reference to the original state
        const originalFilters = store.getSnapshot().filters;
        const originalIdFilter = [...originalFilters['id']];
        const originalStatusFilter = [...originalFilters['status']];

        // Delete a filter
        store.deleteFilters('id');

        // Verify the original references haven't changed
        expect(originalIdFilter).toEqual([1, 2, 3]);
        expect(originalStatusFilter).toEqual(['active', 'pending']);

        // Verify the new state is correct
        expect(store.getSnapshot().filters).toEqual({
          status: ['active', 'pending'],
        });
      });

      it('should handle deep cloning when deleting multiple filters', () => {
        store.addFilters({
          id: [1, 2, 3],
          status: ['active'],
          type: ['user'],
        });

        store.deleteFilters('id', 'type');

        expect(store.getSnapshot().filters).toEqual({
          status: ['active'],
        });
      });

      it('should not affect other filters when deleting one', () => {
        store.addFilters({
          id: [1, 2, 3],
          status: ['active', 'pending'],
          type: ['user', 'admin'],
        });

        const beforeStatus = store.getSnapshot().filters['status'];

        store.deleteFilters('id');

        // The array handed out earlier must be untouched by the later write
        expect(beforeStatus).toEqual(['active', 'pending']);

        // Status filter should remain completely unchanged
        expect(store.getSnapshot().filters['status']).toEqual(['active', 'pending']);
        expect(store.getSnapshot().filters['type']).toEqual(['user', 'admin']);
      });
    });
  });

  // Input Validation Tests
  describe('Input Validation', () => {
    describe('resource validation', () => {
      it('should throw InvalidResourceNameError for empty string', () => {
        expect(() => {
          store.resource = '';
        }).toThrowError(InvalidResourceNameError);
      });

      it('should throw InvalidResourceNameError for whitespace-only string', () => {
        expect(() => {
          store.resource = '   ';
        }).toThrowError(InvalidResourceNameError);
      });

      it('should throw InvalidResourceNameError for null', () => {
        expect(() => {
          store.resource = null as unknown as string;
        }).toThrowError(InvalidResourceNameError);
      });

      it('should throw InvalidResourceNameError for undefined', () => {
        expect(() => {
          store.resource = undefined as unknown as string;
        }).toThrowError(InvalidResourceNameError);
      });

      it('should accept valid resource name', () => {
        expect(() => {
          store.resource = 'users';
        }).not.toThrow();
        expect(store.getSnapshot().resource).toBe('users');
      });
    });

    describe('page validation', () => {
      it('should throw InvalidPageNumberError for zero', () => {
        expect(() => {
          store.page = 0;
        }).toThrowError(InvalidPageNumberError);
      });

      it('should throw InvalidPageNumberError for negative numbers', () => {
        expect(() => {
          store.page = -1;
        }).toThrowError(InvalidPageNumberError);
      });

      it('should throw InvalidPageNumberError for decimal numbers', () => {
        expect(() => {
          store.page = 1.5;
        }).toThrowError(InvalidPageNumberError);
      });

      it('should throw InvalidPageNumberError for NaN', () => {
        expect(() => {
          store.page = NaN;
        }).toThrowError(InvalidPageNumberError);
      });

      it('should accept valid page number (1)', () => {
        expect(() => {
          store.page = 1;
        }).not.toThrow();
        expect(store.getSnapshot().page).toBe(1);
      });

      it('should accept valid page number (100)', () => {
        expect(() => {
          store.page = 100;
        }).not.toThrow();
        expect(store.getSnapshot().page).toBe(100);
      });
    });

    // Limit validation is driver-scoped and lives on each IRequestStrategy;
    // see the per-strategy specs and ng-qubee.store.spec.ts for coverage.
  });

  // Edge Case Tests
  describe('Edge Cases', () => {
    describe('empty arrays and objects', () => {
      it('should handle empty fields object', () => {
        store.addFields({});
        expect(store.getSnapshot().fields).toEqual({});
      });

      it('should handle empty filters object', () => {
        store.addFilters({});
        expect(store.getSnapshot().filters).toEqual({});
      });

      it('should handle empty includes array', () => {
        store.addIncludes([]);
        expect(store.getSnapshot().includes).toEqual([]);
      });

      it('should handle adding fields with empty array values', () => {
        store.addFields({ users: [] });
        expect(store.getSnapshot().fields).toEqual({ users: [] });
      });

      it('should handle adding filters with empty array values', () => {
        store.addFilters({ id: [] });
        expect(store.getSnapshot().filters).toEqual({ id: [] });
      });
    });

    describe('boundary values', () => {
      it('should accept limit value of 1', () => {
        store.limit = 1;
        expect(store.getSnapshot().limit).toBe(1);
      });

      it('should accept page value of 1', () => {
        store.page = 1;
        expect(store.getSnapshot().page).toBe(1);
      });

      it('should accept very large limit value', () => {
        store.limit = 1000000;
        expect(store.getSnapshot().limit).toBe(1000000);
      });

      it('should accept very large page value', () => {
        store.page = 1000000;
        expect(store.getSnapshot().page).toBe(1000000);
      });
    });

    describe('string edge cases', () => {
      it('should handle resource names with special characters', () => {
        store.resource = 'user-profiles';
        expect(store.getSnapshot().resource).toBe('user-profiles');
      });

      it('should handle resource names with numbers', () => {
        store.resource = 'users123';
        expect(store.getSnapshot().resource).toBe('users123');
      });

      it('should handle resource names with underscores', () => {
        store.resource = 'user_profiles';
        expect(store.getSnapshot().resource).toBe('user_profiles');
      });

      it('should handle baseUrl with trailing slash', () => {
        store.baseUrl = 'https://api.example.com/';
        expect(store.getSnapshot().baseUrl).toBe('https://api.example.com/');
      });

      it('should handle baseUrl without trailing slash', () => {
        store.baseUrl = 'https://api.example.com';
        expect(store.getSnapshot().baseUrl).toBe('https://api.example.com');
      });
    });

    describe('multiple operations', () => {
      it('should handle adding fields multiple times for same model', () => {
        store.addFields({ users: ['id', 'name'] });
        store.addFields({ users: ['email'] });
        store.addFields({ users: ['age'] });

        expect(store.getSnapshot().fields['users']).toEqual(['id', 'name', 'email', 'age']);
      });

      it('should handle adding filters multiple times for same key', () => {
        store.addFilters({ status: ['active'] });
        store.addFilters({ status: ['pending'] });
        store.addFilters({ status: ['completed'] });

        expect(store.getSnapshot().filters['status']).toEqual(['active', 'pending', 'completed']);
      });

      it('should handle adding includes multiple times', () => {
        store.addIncludes(['profile']);
        store.addIncludes(['posts']);
        store.addIncludes(['comments']);

        expect(store.getSnapshot().includes).toEqual(['profile', 'posts', 'comments']);
      });

      it('should handle adding multiple sorts', () => {
        store.addSort({ field: 'name', order: SortEnum.ASC });
        store.addSort({ field: 'created_at', order: SortEnum.DESC });
        store.addSort({ field: 'id', order: SortEnum.ASC });

        expect(store.getSnapshot().sorts).toEqual([
          { field: 'name', order: SortEnum.ASC },
          { field: 'created_at', order: SortEnum.DESC },
          { field: 'id', order: SortEnum.ASC },
        ]);
      });
    });

    describe('delete operations edge cases', () => {
      it('should handle deleting non-existent field', () => {
        store.addFields({ users: ['id', 'name'] });
        store.deleteFields({ posts: ['title'] });

        expect(store.getSnapshot().fields).toEqual({ users: ['id', 'name'] });
      });

      it('should handle deleting non-existent filter', () => {
        store.addFilters({ id: [1, 2, 3] });
        store.deleteFilters('status');

        expect(store.getSnapshot().filters).toEqual({ id: [1, 2, 3] });
      });

      it('should handle deleting non-existent include', () => {
        store.addIncludes(['profile']);
        store.deleteIncludes('posts');

        expect(store.getSnapshot().includes).toEqual(['profile']);
      });

      it('should handle deleting non-existent sort', () => {
        store.addSort({ field: 'name', order: SortEnum.ASC });
        store.deleteSorts('created_at');

        expect(store.getSnapshot().sorts).toEqual([{ field: 'name', order: SortEnum.ASC }]);
      });

      it('should handle deleting all fields from a model', () => {
        store.addFields({ users: ['id', 'name', 'email'] });
        store.deleteFields({ users: ['id', 'name', 'email'] });

        expect(store.getSnapshot().fields['users']).toEqual([]);
      });

      it('should handle deleting all includes', () => {
        store.addIncludes(['profile', 'posts', 'comments']);
        store.deleteIncludes('profile', 'posts', 'comments');

        expect(store.getSnapshot().includes).toEqual([]);
      });

      it('should handle deleting all sorts', () => {
        store.addSort({ field: 'name', order: SortEnum.ASC });
        store.addSort({ field: 'created_at', order: SortEnum.DESC });
        store.deleteSorts('name', 'created_at');

        expect(store.getSnapshot().sorts).toEqual([]);
      });
    });
  });

  // Integration Tests
  describe('Integration Tests', () => {
    describe('complete query building workflow', () => {
      it('should build a complete query with all parameters', () => {
        store.baseUrl = 'https://api.example.com';
        store.resource = 'users';
        store.page = 2;
        store.limit = 25;

        store.addFields({ users: ['id', 'email', 'username'] });
        store.addFilters({ status: ['active'], role: ['admin'] });
        store.addIncludes(['profile', 'posts']);
        store.addSort({ field: 'created_at', order: SortEnum.DESC });

        const state = store.getSnapshot();

        expect(state.baseUrl).toBe('https://api.example.com');
        expect(state.resource).toBe('users');
        expect(state.page).toBe(2);
        expect(state.limit).toBe(25);
        expect(state.fields).toEqual({ users: ['id', 'email', 'username'] });
        expect(state.filters).toEqual({ status: ['active'], role: ['admin'] });
        expect(state.includes).toEqual(['profile', 'posts']);
        expect(state.sorts).toEqual([{ field: 'created_at', order: SortEnum.DESC }]);
      });

      it('should reset and rebuild query', () => {
        // Build initial query
        store.resource = 'users';
        store.addFields({ users: ['id'] });
        store.addFilters({ status: ['active'] });

        expect(store.getSnapshot().resource).toBe('users');

        // Reset
        store.reset();

        expect(store.getSnapshot()).toEqual({
          baseUrl: '',
          embedded: {},
          fields: {},
          filters: {},
          includes: [],
          isLastPageKnown: false,
          lastPage: 1,
          limit: 15,
          operatorFilters: [],
          page: 1,
          params: {},
          resource: '',
          search: '',
          select: [],
          sorts: [],
        });

        // Rebuild
        store.resource = 'posts';
        store.addFields({ posts: ['title'] });

        expect(store.getSnapshot().resource).toBe('posts');
        expect(store.getSnapshot().fields).toEqual({ posts: ['title'] });
      });

      it('should handle complex multi-model field selection', () => {
        store.addFields({ users: ['id', 'email'] });
        store.addFields({ posts: ['title', 'content'] });
        store.addFields({ comments: ['text', 'author_id'] });

        expect(store.getSnapshot().fields).toEqual({
          users: ['id', 'email'],
          posts: ['title', 'content'],
          comments: ['text', 'author_id'],
        });
      });

      it('should handle complex multi-key filtering', () => {
        store.addFilters({ id: [1, 2, 3] });
        store.addFilters({ status: ['active', 'pending'] });
        store.addFilters({ role: ['admin', 'moderator', 'user'] });

        expect(store.getSnapshot().filters).toEqual({
          id: [1, 2, 3],
          status: ['active', 'pending'],
          role: ['admin', 'moderator', 'user'],
        });
      });

      it('should maintain state immutability across multiple reads', () => {
        store.resource = 'users';
        store.addFields({ users: ['id'] });

        const state1 = store.getSnapshot();

        // Trigger a signal update to force recomputation and get a new clone
        store.page = 2;

        const state2 = store.getSnapshot();

        // Snapshots are frozen, so tampering fails loudly rather than silently
        // corrupting a later read. (ng-qubee allowed the push and relied on the
        // clone to absorb it; throwing is the stronger guarantee.)
        expect(() => state1.fields['users']?.push('email')).toThrow(TypeError);

        // Successive snapshots remain independent regardless
        expect(state2.fields['users']).toEqual(['id']);
        expect(state2.fields['users']).not.toContain('email');
      });
    });

    describe('modification and deletion workflow', () => {
      it('should add, modify, and delete fields correctly', () => {
        // Add initial fields
        store.addFields({ users: ['id', 'name', 'email'] });
        expect(store.getSnapshot().fields['users']).toEqual(['id', 'name', 'email']);

        // Add more fields
        store.addFields({ users: ['age', 'country'] });
        expect(store.getSnapshot().fields['users']).toEqual([
          'id',
          'name',
          'email',
          'age',
          'country',
        ]);

        // Delete some fields
        store.deleteFields({ users: ['email', 'country'] });
        expect(store.getSnapshot().fields['users']).toEqual(['id', 'name', 'age']);
      });

      it('should add, modify, and delete filters correctly', () => {
        // Add initial filters
        store.addFilters({ status: ['active'] });
        expect(store.getSnapshot().filters['status']).toEqual(['active']);

        // Add more filters
        store.addFilters({ status: ['pending', 'completed'] });
        expect(store.getSnapshot().filters['status']).toEqual(['active', 'pending', 'completed']);

        // Delete filter completely
        store.deleteFilters('status');
        expect(store.getSnapshot().filters).toEqual({});
      });

      it('should handle mixed operations in sequence', () => {
        // Setup
        store.resource = 'users';
        store.page = 1;
        store.limit = 20;

        // Add data
        store.addFields({ users: ['id', 'name'] });
        store.addFilters({ status: ['active'] });
        store.addIncludes(['profile']);
        store.addSort({ field: 'created_at', order: SortEnum.DESC });

        // Verify state
        expect(store.getSnapshot().fields['users']).toEqual(['id', 'name']);

        // Modify
        store.addFields({ users: ['email'] });
        store.page = 2;

        // Verify modifications
        expect(store.getSnapshot().fields['users']).toEqual(['id', 'name', 'email']);
        expect(store.getSnapshot().page).toBe(2);

        // Delete some data
        store.deleteFields({ users: ['name'] });
        store.deleteIncludes('profile');

        // Verify deletions
        expect(store.getSnapshot().fields['users']).toEqual(['id', 'email']);
        expect(store.getSnapshot().includes).toEqual([]);

        // Reset and verify clean state
        store.reset();
        expect(store.getSnapshot().resource).toBe('');
        expect(store.getSnapshot().fields).toEqual({});
      });
    });

    describe('signal reactivity', () => {
      it('should emit new values when state changes', () => {
        const initialState = store.getSnapshot();
        expect(initialState.resource).toBe('');

        store.resource = 'users';
        const updatedState = store.getSnapshot();

        expect(updatedState.resource).toBe('users');
        expect(updatedState).not.toBe(initialState);
      });

      it('should provide isolated state snapshots', () => {
        store.addFields({ users: ['id'] });

        const snapshot1 = store.getSnapshot();
        const fields1 = snapshot1.fields;

        store.addFields({ users: ['name'] });

        const snapshot2 = store.getSnapshot();
        const fields2 = snapshot2.fields;

        // Original snapshot should remain unchanged
        expect(fields1['users']).toEqual(['id']);
        expect(fields2['users']).toEqual(['id', 'name']);
      });
    });
  });

  // NestJS-specific State Management
  describe('NestJS State Management', () => {
    describe('addOperatorFilters', () => {
      it('should add operator filters', () => {
        store.addOperatorFilters([
          { field: 'age', operator: FilterOperatorEnum.GTE, values: [18] },
        ]);

        expect(store.getSnapshot().operatorFilters).toEqual([
          { field: 'age', operator: FilterOperatorEnum.GTE, values: [18] },
        ]);
      });

      it('should merge operator filters with same field and operator', () => {
        store.addOperatorFilters([
          { field: 'id', operator: FilterOperatorEnum.IN, values: [1, 2] },
        ]);

        store.addOperatorFilters([
          { field: 'id', operator: FilterOperatorEnum.IN, values: [2, 3] },
        ]);

        expect(store.getSnapshot().operatorFilters).toEqual([
          { field: 'id', operator: FilterOperatorEnum.IN, values: [1, 2, 3] },
        ]);
      });

      it('should keep separate operator filters for different operators on the same field', () => {
        store.addOperatorFilters([
          { field: 'age', operator: FilterOperatorEnum.GTE, values: [18] },
          { field: 'age', operator: FilterOperatorEnum.LTE, values: [65] },
        ]);

        expect(store.getSnapshot().operatorFilters).toHaveLength(2);
        expect(store.getSnapshot().operatorFilters[0].operator).toBe(FilterOperatorEnum.GTE);
        expect(store.getSnapshot().operatorFilters[1].operator).toBe(FilterOperatorEnum.LTE);
      });

      it('should handle multiple operator filters on different fields', () => {
        store.addOperatorFilters([
          { field: 'age', operator: FilterOperatorEnum.GTE, values: [18] },
          { field: 'status', operator: FilterOperatorEnum.EQ, values: ['active'] },
        ]);

        expect(store.getSnapshot().operatorFilters).toHaveLength(2);
      });
    });

    describe('addSelect', () => {
      it('should add select fields', () => {
        store.addSelect(['id', 'name', 'email']);

        expect(store.getSnapshot().select).toEqual(['id', 'name', 'email']);
      });

      it('should prevent duplicate select fields', () => {
        store.addSelect(['id', 'name']);
        store.addSelect(['name', 'email']);

        expect(store.getSnapshot().select).toEqual(['id', 'name', 'email']);
      });

      it('should handle empty array', () => {
        store.addSelect([]);

        expect(store.getSnapshot().select).toEqual([]);
      });
    });

    describe('setSearch', () => {
      it('should set search term', () => {
        store.setSearch('john doe');

        expect(store.getSnapshot().search).toBe('john doe');
      });

      it('should overwrite previous search term', () => {
        store.setSearch('john');
        store.setSearch('jane');

        expect(store.getSnapshot().search).toBe('jane');
      });
    });

    describe('deleteOperatorFilters', () => {
      it('should remove operator filters by field name', () => {
        store.addOperatorFilters([
          { field: 'age', operator: FilterOperatorEnum.GTE, values: [18] },
          { field: 'status', operator: FilterOperatorEnum.EQ, values: ['active'] },
        ]);

        store.deleteOperatorFilters('age');

        expect(store.getSnapshot().operatorFilters).toHaveLength(1);
        expect(store.getSnapshot().operatorFilters[0].field).toBe('status');
      });

      it('should remove all operator filters for a field', () => {
        store.addOperatorFilters([
          { field: 'age', operator: FilterOperatorEnum.GTE, values: [18] },
          { field: 'age', operator: FilterOperatorEnum.LTE, values: [65] },
        ]);

        store.deleteOperatorFilters('age');

        expect(store.getSnapshot().operatorFilters).toHaveLength(0);
      });

      it('should handle deleting non-existent field', () => {
        store.addOperatorFilters([
          { field: 'age', operator: FilterOperatorEnum.GTE, values: [18] },
        ]);

        store.deleteOperatorFilters('status');

        expect(store.getSnapshot().operatorFilters).toHaveLength(1);
      });
    });

    describe('deleteSearch', () => {
      it('should clear the search term', () => {
        store.setSearch('john');
        store.deleteSearch();

        expect(store.getSnapshot().search).toBe('');
      });
    });

    describe('deleteSelect', () => {
      it('should remove select fields', () => {
        store.addSelect(['id', 'name', 'email']);
        store.deleteSelect('name');

        expect(store.getSnapshot().select).toEqual(['id', 'email']);
      });

      it('should remove multiple select fields', () => {
        store.addSelect(['id', 'name', 'email']);
        store.deleteSelect('name', 'email');

        expect(store.getSnapshot().select).toEqual(['id']);
      });

      it('should handle deleting non-existent field', () => {
        store.addSelect(['id', 'name']);
        store.deleteSelect('email');

        expect(store.getSnapshot().select).toEqual(['id', 'name']);
      });
    });

    describe('reset clears NestJS state', () => {
      it('should reset operator filters, search, and select', () => {
        store.addOperatorFilters([
          { field: 'age', operator: FilterOperatorEnum.GTE, values: [18] },
        ]);
        store.addSelect(['id', 'name']);
        store.setSearch('john');

        store.reset();

        expect(store.getSnapshot().operatorFilters).toEqual([]);
        expect(store.getSnapshot().select).toEqual([]);
        expect(store.getSnapshot().search).toBe('');
      });
    });
  });

  // The reactive contract — new in @qubeejs/core, no ng-qubee equivalent.
  describe('getSnapshot / subscribe', () => {
    it('returns a stable identity between writes', () => {
      // useSyncExternalStore re-renders whenever the reference changes, so a
      // fresh clone per call would loop forever.
      expect(store.getSnapshot()).toBe(store.getSnapshot());
    });

    it('returns a new identity after a write', () => {
      const before = store.getSnapshot();

      store.setSearch('term');

      expect(store.getSnapshot()).not.toBe(before);
    });

    it('hands out a frozen snapshot', () => {
      const snapshot = store.getSnapshot();

      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(() => snapshot.includes.push('tampered')).toThrow(TypeError);
      expect(store.getSnapshot().includes).toEqual([]);
    });

    it('notifies subscribers on every write', () => {
      let calls = 0;

      store.subscribe(() => (calls += 1));
      store.setSearch('a');
      store.addIncludes(['author']);

      expect(calls).toBe(2);
    });

    it('notifies every subscriber', () => {
      const seen: string[] = [];

      store.subscribe(() => seen.push('first'));
      store.subscribe(() => seen.push('second'));
      store.setSearch('a');

      expect(seen).toEqual(['first', 'second']);
    });

    it('gives subscribers the post-write state', () => {
      let observed = '';

      store.subscribe(() => (observed = store.getSnapshot().search));
      store.setSearch('after');

      expect(observed).toBe('after');
    });

    it('stops notifying once unsubscribed', () => {
      let calls = 0;
      const unsubscribe = store.subscribe(() => (calls += 1));

      store.setSearch('a');
      unsubscribe();
      store.setSearch('b');

      expect(calls).toBe(1);
    });

    it('tolerates unsubscribing twice', () => {
      const unsubscribe = store.subscribe(() => undefined);

      unsubscribe();

      expect(() => unsubscribe()).not.toThrow();
    });

    it('notifies on reset', () => {
      let calls = 0;

      store.subscribe(() => (calls += 1));
      store.reset();

      expect(calls).toBe(1);
    });

    it('freezes nested structures, not just the root', () => {
      store.addFields({ users: ['id'] });

      const snapshot = store.getSnapshot();

      expect(Object.isFrozen(snapshot.fields)).toBe(true);
      expect(() => snapshot.fields['users']?.push('tampered')).toThrow(TypeError);
      expect(store.getSnapshot().fields['users']).toEqual(['id']);
    });

    it('keeps writing after handing out a frozen snapshot', () => {
      const snapshot = store.getSnapshot();

      store.addIncludes(['author']);

      // The frozen copy must not freeze the store's own working state.
      expect(snapshot.includes).toEqual([]);
      expect(store.getSnapshot().includes).toEqual(['author']);
    });
  });

  describe('binding', () => {
    it('should read the snapshot through a detached getSnapshot', () => {
      const { getSnapshot } = store;

      store.page = 3;

      expect(getSnapshot().page).toBe(3);
    });

    it('should notify a listener registered through a detached subscribe', () => {
      const { subscribe } = store;
      const listener = vi.fn();

      const unsubscribe = subscribe(listener);
      store.page = 2;
      unsubscribe();
      store.page = 3;

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should keep one getSnapshot and one subscribe per store', () => {
      // useSyncExternalStore resubscribes whenever `subscribe` changes identity.
      expect(store.getSnapshot).toBe(store.getSnapshot);
      expect(store.subscribe).toBe(store.subscribe);
      expect(store.subscribe).not.toBe(new QubeeStore().subscribe);
    });
  });
});
