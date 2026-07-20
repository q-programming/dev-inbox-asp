import { SettingsClient, UserSettingsDto } from '@api';
import { ApiError, apiFetch, BASE_URL } from '@shared/api/httpClient';
import { queryClient } from '@shared/api/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';

export const settingsApi = new SettingsClient(BASE_URL, { fetch: apiFetch });

export const settingsKeys = {
  all: ['settings'] as const,
  get: ['settings', 'get'] as const,
} as const;

export const useSettingsQuery = (enabled: boolean = true) =>
  useQuery<UserSettingsDto | null | undefined, ApiError>({
    queryKey: settingsKeys.get,
    queryFn: async () => {
      try {
        return await settingsApi.getSettings();
      } catch (error: unknown) {
        // NSwag throws SwaggerException with status 204 for "No user found" —
        // treat it as a null session rather than an error.
        if ((error as { status?: number })?.status === 204) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 30_000,
    retry: false,
    enabled,
  });

export const useSettingsMutation = () =>
  useMutation<UserSettingsDto, ApiError, UserSettingsDto>({
    mutationFn: (data) => settingsApi.updateSettings(data),
    onSuccess: (data) => queryClient.setQueryData(settingsKeys.get, data),
  });
