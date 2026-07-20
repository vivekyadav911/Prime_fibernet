import { baseApi } from './baseApi';
import type { ImportEntityType } from '@/utils/importTemplates';
import { parseSupabaseFunctionError } from '@/utils/supabaseFunctionError';

export type ImportFieldDiff = Record<string, { old: unknown; new: unknown }>;

export type ImportPreviewRow = {
  row_number: number;
  match_key: string | null;
  action: 'insert' | 'update' | 'unchanged' | 'error';
  diff: ImportFieldDiff | null;
  error_message: string | null;
};

export type ImportStageResult = {
  batch_id: string;
  entity_type: ImportEntityType;
  file_name: string;
  counts: {
    insert: number;
    update: number;
    unchanged: number;
    error: number;
  };
  rows: ImportPreviewRow[];
};

export type ImportCommitResult = {
  history_id: string;
  batch_id: string;
  entity_type: string;
  rows_inserted: number;
  rows_updated: number;
  rows_unchanged: number;
  rows_errored: number;
};

export type ImportHistoryRow = {
  id: string;
  batch_id: string;
  entity_type: string;
  performed_by: string | null;
  file_name: string | null;
  rows_inserted: number;
  rows_updated: number;
  rows_unchanged: number;
  rows_errored: number;
  created_at: string;
  admin_name?: string | null;
};

async function fileToBase64(uri: string, blob?: Blob): Promise<string> {
  if (blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.includes(',') ? result.split(',')[1]! : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const FileSystem = await import('expo-file-system/legacy');
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });
  return base64;
}

export const adminImportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    stageExcelImport: builder.mutation<
      ImportStageResult,
      { entityType: ImportEntityType; fileUri: string; fileName: string; fileBlob?: Blob }
    >({
      query: ({ entityType, fileUri, fileName, fileBlob }) => ({
        handler: async (client) => {
          const file_base64 = await fileToBase64(fileUri, fileBlob);
          const { data, error } = await client.functions.invoke('import-excel', {
            body: {
              action: 'stage',
              entity_type: entityType,
              file_base64,
              file_name: fileName,
            },
          });
          if (error) throw new Error(await parseSupabaseFunctionError(error));
          if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
            throw new Error(String((data as { error: string }).error));
          }
          return data as ImportStageResult;
        },
      }),
    }),

    commitExcelImport: builder.mutation<ImportCommitResult, { batchId: string }>({
      query: ({ batchId }) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('import-excel', {
            body: { action: 'commit', batch_id: batchId },
          });
          if (error) throw new Error(await parseSupabaseFunctionError(error));
          if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
            throw new Error(String((data as { error: string }).error));
          }
          return data as ImportCommitResult;
        },
      }),
      invalidatesTags: ['Settings'],
    }),

    getImportHistory: builder.query<ImportHistoryRow[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('import_history')
            .select('id, batch_id, entity_type, performed_by, file_name, rows_inserted, rows_updated, rows_unchanged, rows_errored, created_at')
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;

          const rows = (data ?? []) as ImportHistoryRow[];
          const adminIds = [...new Set(rows.map((r) => r.performed_by).filter(Boolean))] as string[];
          if (!adminIds.length) return rows;

          const { data: admins } = await client.from('admins').select('id, name').in('id', adminIds);
          const nameById = new Map((admins ?? []).map((a) => [a.id as string, a.name as string]));
          return rows.map((r) => ({
            ...r,
            admin_name: r.performed_by ? nameById.get(r.performed_by) ?? null : null,
          }));
        },
      }),
      providesTags: ['Settings'],
    }),
  }),
});

export const {
  useStageExcelImportMutation,
  useCommitExcelImportMutation,
  useGetImportHistoryQuery,
} = adminImportApi;
