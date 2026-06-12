import { HealthApi } from '@api/shared';
import { apiConfig } from './httpClient';

/**
 * Singleton HealthApi instance backed by the shared httpClient configuration.
 * Credentials are injected automatically; non-2xx responses throw `ApiError`.
 */
export const healthApi = new HealthApi(apiConfig);
