import type { UnsupportedCapabilityError } from '../errors/unsupported-capability.error';
import type { DriverDefinition } from './driver-definition.type';
import type { DriverId } from './driver-id.type';
import type { Driver } from './driver.type';

describe('DriverId', () => {
  it('accepts every built-in driver id', () => {
    expectTypeOf<Driver>().toExtend<DriverId>();
  });

  it('accepts an id this package does not ship', () => {
    expectTypeOf<'studio-api'>().toExtend<DriverId>();
  });

  it('does not collapse to plain string, so built-in ids still autocomplete', () => {
    // `Driver | string` reduces to `string` and drops every literal from the
    // editor's suggestions; the `string & {}` arm is what prevents that.
    expectTypeOf<DriverId>().not.toEqualTypeOf<string>();
  });

  it('rejects non-strings', () => {
    expectTypeOf<number>().not.toExtend<DriverId>();
    expectTypeOf<undefined>().not.toExtend<DriverId>();
  });

  it('types every place a driver id flows', () => {
    expectTypeOf<DriverDefinition['id']>().toEqualTypeOf<DriverId>();
    expectTypeOf<UnsupportedCapabilityError['driver']>().toEqualTypeOf<DriverId | undefined>();
  });
});
