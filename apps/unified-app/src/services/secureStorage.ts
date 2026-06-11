import type { SupabaseStorageAdapter } from '@prime/api-client';

import { createHybridSecureStorage } from '@/services/hybridSecureStorage';

export const secureStorageAdapter: SupabaseStorageAdapter = createHybridSecureStorage();
