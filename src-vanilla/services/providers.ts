/**
 * Public `providersService` — thin re-export of the repository chosen by
 * the factory at boot. The `Provider` type is re-exported here for
 * convenience so callers keep `import { providersService, Provider } from
 * '../services'` intact.
 */

import { repositories } from '../repositories';
import type { ProvidersRepository } from '../repositories/types';

export type { Provider } from './providers-types';
export const providersService: ProvidersRepository = repositories.providers;
