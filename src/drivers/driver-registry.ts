import type { DriverDefinition } from '../types/driver-definition.type';

import { DriverEnum } from '../enums/driver.enum';
import { API_PLATFORM_DRIVER } from './api-platform.driver';
import { DIRECTUS_DRIVER } from './directus.driver';
import { DRF_DRIVER } from './drf.driver';
import { FEATHERS_DRIVER } from './feathers.driver';
import { JSON_API_DRIVER } from './json-api.driver';
import { JSON_SERVER_DRIVER } from './json-server.driver';
import { LARAVEL_DRIVER } from './laravel.driver';
import { NESTJS_DRIVER } from './nestjs.driver';
import { NESTJSX_CRUD_DRIVER } from './nestjsx-crud.driver';
import { ODATA_DRIVER } from './odata.driver';
import { PAYLOAD_DRIVER } from './payload.driver';
import { POCKETBASE_DRIVER } from './pocketbase.driver';
import { POSTGREST_DRIVER } from './postgrest.driver';
import { RANSACK_DRIVER } from './ransack.driver';
import { SIEVE_DRIVER } from './sieve.driver';
import { SPATIE_DRIVER } from './spatie.driver';
import { SPRING_DRIVER } from './spring.driver';
import { STRAPI_DRIVER } from './strapi.driver';
import { WORDPRESS_DRIVER } from './wordpress.driver';

/**
 * Every supported driver, keyed by its `DriverEnum` member
 *
 * `Record<DriverEnum, DriverDefinition>` gives compile-time exhaustiveness:
 * adding a value to `DriverEnum` fails to compile until its definition is
 * registered here.
 *
 * Reading this map reaches every driver, so a consumer that knows its backend
 * at build time should import the driver constant directly
 * (`import { STRAPI_DRIVER } from '@qubeejs/core'`) and let the rest tree-shake.
 */
export const DRIVERS: Record<DriverEnum, DriverDefinition> = {
  [DriverEnum.API_PLATFORM]: API_PLATFORM_DRIVER,
  [DriverEnum.DIRECTUS]: DIRECTUS_DRIVER,
  [DriverEnum.DRF]: DRF_DRIVER,
  [DriverEnum.FEATHERS]: FEATHERS_DRIVER,
  [DriverEnum.JSON_API]: JSON_API_DRIVER,
  [DriverEnum.JSON_SERVER]: JSON_SERVER_DRIVER,
  [DriverEnum.LARAVEL]: LARAVEL_DRIVER,
  [DriverEnum.NESTJS]: NESTJS_DRIVER,
  [DriverEnum.NESTJSX_CRUD]: NESTJSX_CRUD_DRIVER,
  [DriverEnum.ODATA]: ODATA_DRIVER,
  [DriverEnum.PAYLOAD]: PAYLOAD_DRIVER,
  [DriverEnum.POCKETBASE]: POCKETBASE_DRIVER,
  [DriverEnum.POSTGREST]: POSTGREST_DRIVER,
  [DriverEnum.RANSACK]: RANSACK_DRIVER,
  [DriverEnum.SIEVE]: SIEVE_DRIVER,
  [DriverEnum.SPATIE]: SPATIE_DRIVER,
  [DriverEnum.SPRING]: SPRING_DRIVER,
  [DriverEnum.STRAPI]: STRAPI_DRIVER,
  [DriverEnum.WORDPRESS]: WORDPRESS_DRIVER,
};
