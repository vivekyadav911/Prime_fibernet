import type { ContractFormValues, ContractVersion, CompanyDefaults, ContractSignerRole, EmploymentContract, EmploymentContractRow } from '@/types/contract';
import {
  buildContractStoragePath,
  buildContractSignaturePath,
  formValuesToContractRow,
  mapCompanyDefaultsRow,
  mapEmploymentContractRow,
} from '@/types/contract';

import { baseApi } from './baseApi';

const CONTRACT_SELECT = '*';

function mapVersionRow(row: {
  id: string;
  contract_id: string;
  version_number: number;
  snapshot: unknown;
  pdf_url: string | null;
  created_by: string | null;
  created_at: string;
}): ContractVersion {
  const snapshotRaw = row.snapshot as EmploymentContractRow;
  return {
    id: row.id,
    contractId: row.contract_id,
    versionNumber: row.version_number,
    snapshot: mapEmploymentContractRow(snapshotRaw),
    pdfUrl: row.pdf_url,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export const employmentContractsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmploymentContract: builder.query<EmploymentContract | null, string>({
      query: (officerId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('employment_contracts')
            .select(CONTRACT_SELECT)
            .eq('officer_id', officerId)
            .maybeSingle();
          if (error) throw error;
          if (!data) return null;
          return mapEmploymentContractRow(data as EmploymentContractRow);
        },
      }),
      providesTags: (_r, _e, officerId) => [{ type: 'EmploymentContracts', id: officerId }],
    }),

    getMyEmploymentContract: builder.query<EmploymentContract | null, void>({
      query: () => ({
        handler: async (client) => {
          const { data: officerId, error: rpcError } = await client.rpc('current_officer_id');
          if (rpcError) throw rpcError;
          if (!officerId) return null;
          const { data, error } = await client
            .from('employment_contracts')
            .select(CONTRACT_SELECT)
            .eq('officer_id', officerId)
            .maybeSingle();
          if (error) throw error;
          if (!data) return null;
          return mapEmploymentContractRow(data as EmploymentContractRow);
        },
      }),
      providesTags: [{ type: 'EmploymentContracts', id: 'SELF' }],
    }),

    upsertEmploymentContractDraft: builder.mutation<
      EmploymentContract,
      { values: ContractFormValues; userId: string | null }
    >({
      query: ({ values, userId }) => ({
        handler: async (client) => {
          const payload = formValuesToContractRow(values, 'draft', userId);
          const { id: _id, ...insertPayload } = payload;

          if (values.contractId) {
            const { data, error } = await client
              .from('employment_contracts')
              .update(insertPayload)
              .eq('id', values.contractId)
              .select(CONTRACT_SELECT)
              .single();
            if (error) throw error;
            return mapEmploymentContractRow(data as EmploymentContractRow);
          }

          const { data, error } = await client
            .from('employment_contracts')
            .insert({ ...insertPayload, version: 1 })
            .select(CONTRACT_SELECT)
            .single();
          if (error) throw error;
          return mapEmploymentContractRow(data as EmploymentContractRow);
        },
      }),
      invalidatesTags: (_r, _e, { values }) => [
        { type: 'EmploymentContracts', id: values.officerId },
        { type: 'EmploymentContracts', id: 'SELF' },
      ],
    }),

    finalizeEmploymentContract: builder.mutation<
      EmploymentContract,
      {
        values: ContractFormValues;
        userId: string | null;
        storagePath: string;
        archivedVersion?: {
          versionNumber: number;
          snapshot: import('@/types/contract').EmploymentContractRow;
          pdfUrl: string | null;
        };
        newVersion: number;
      }
    >({
      query: ({ values, userId, storagePath, archivedVersion, newVersion }) => ({
        handler: async (client) => {
          if (archivedVersion && values.contractId) {
            const { error: archiveError } = await client.from('employment_contract_versions').insert({
              contract_id: values.contractId,
              version_number: archivedVersion.versionNumber,
              snapshot: archivedVersion.snapshot,
              pdf_url: archivedVersion.pdfUrl,
              created_by: userId,
            });
            if (archiveError) throw archiveError;
          }

          const payload = formValuesToContractRow(values, 'generated', userId);
          const updatePayload = {
            ...payload,
            generated_pdf_url: storagePath,
            version: newVersion,
            status: 'generated' as const,
          };
          delete (updatePayload as { id?: string }).id;

          if (values.contractId) {
            const { data, error } = await client
              .from('employment_contracts')
              .update(updatePayload)
              .eq('id', values.contractId)
              .select(CONTRACT_SELECT)
              .single();
            if (error) throw error;
            return mapEmploymentContractRow(data as EmploymentContractRow);
          }

          const { data, error } = await client
            .from('employment_contracts')
            .insert({ ...updatePayload, version: newVersion })
            .select(CONTRACT_SELECT)
            .single();
          if (error) throw error;
          return mapEmploymentContractRow(data as EmploymentContractRow);
        },
      }),
      invalidatesTags: (_r, _e, { values }) => [
        { type: 'EmploymentContracts', id: values.officerId },
        { type: 'EmploymentContracts', id: 'SELF' },
        { type: 'EmploymentContractVersions', id: values.contractId ?? 'NEW' },
      ],
    }),

    getContractVersions: builder.query<ContractVersion[], string>({
      query: (contractId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('employment_contract_versions')
            .select('*')
            .eq('contract_id', contractId)
            .order('version_number', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => mapVersionRow(row as Parameters<typeof mapVersionRow>[0]));
        },
      }),
      providesTags: (_r, _e, contractId) => [{ type: 'EmploymentContractVersions', id: contractId }],
    }),

    getCompanyContractDefaults: builder.query<CompanyDefaults | null, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('company_contract_defaults')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          if (!data) return null;
          return mapCompanyDefaultsRow(data);
        },
      }),
      providesTags: ['EmploymentContracts'],
    }),

    saveCompanyContractDefaults: builder.mutation<
      CompanyDefaults,
      Omit<CompanyDefaults, 'id' | 'updatedAt'> & { id?: string }
    >({
      query: (input) => ({
        handler: async (client) => {
          const row = {
            company_name: input.companyName,
            company_address: input.companyAddress,
            company_cin: input.companyCin,
            company_pan: input.companyPan,
            default_signatory_name: input.defaultSignatoryName,
            default_signatory_designation: input.defaultSignatoryDesignation,
            logo_url: input.logoUrl,
            default_governing_law: input.defaultGoverningLaw,
          };

          if (input.id) {
            const { data, error } = await client
              .from('company_contract_defaults')
              .update(row)
              .eq('id', input.id)
              .select('*')
              .single();
            if (error) throw error;
            return mapCompanyDefaultsRow(data);
          }

          const { data, error } = await client
            .from('company_contract_defaults')
            .insert(row)
            .select('*')
            .single();
          if (error) throw error;
          return mapCompanyDefaultsRow(data);
        },
      }),
      invalidatesTags: ['EmploymentContracts'],
    }),

    getContractSignedUrl: builder.query<string, { storagePath: string; expirySeconds?: number }>({
      query: ({ storagePath, expirySeconds = 604800 }) => ({
        handler: async (client) => {
          const { data, error } = await client.storage
            .from('employment-contracts')
            .createSignedUrl(storagePath, expirySeconds);
          if (error) throw error;
          if (!data?.signedUrl) throw new Error('Could not create signed URL');
          return data.signedUrl;
        },
      }),
    }),

    requestEmployeeSignature: builder.mutation<
      EmploymentContract,
      { contractId: string; officerId: string }
    >({
      query: ({ contractId }) => ({
        handler: async (client) => {
          const { error: rpcError } = await client.rpc('notify_officer_contract_signature', {
            p_contract_id: contractId,
          });
          if (rpcError) throw rpcError;

          const { data, error } = await client
            .from('employment_contracts')
            .select(CONTRACT_SELECT)
            .eq('id', contractId)
            .single();
          if (error) throw error;
          return mapEmploymentContractRow(data as EmploymentContractRow);
        },
      }),
      invalidatesTags: (_r, _e, { officerId }) => [
        { type: 'EmploymentContracts', id: officerId },
        { type: 'EmploymentContracts', id: 'SELF' },
        'PortalNotifications',
      ],
    }),

    submitContractSignature: builder.mutation<
      EmploymentContract,
      {
        contractId: string;
        officerId: string;
        role: ContractSignerRole;
        signaturePath: string;
        signatureBase64: string;
        userId: string;
      }
    >({
      query: ({ contractId, role, signaturePath, signatureBase64, userId }) => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('submit_employment_contract_signature', {
            p_contract_id: contractId,
            p_role: role,
            p_signature_path: signaturePath,
            p_signature_base64: signatureBase64,
            p_signed_by: userId,
          });
          if (error) throw error;
          if (!data) throw new Error('Signature submission failed');
          return mapEmploymentContractRow(data as EmploymentContractRow);
        },
      }),
      invalidatesTags: (_r, _e, { officerId, contractId }) => [
        { type: 'EmploymentContracts', id: officerId },
        { type: 'EmploymentContracts', id: 'SELF' },
        { type: 'EmploymentContractVersions', id: contractId },
      ],
    }),

    regenerateSignedContractPdf: builder.mutation<
      EmploymentContract,
      {
        contractId: string;
        officerId: string;
        storagePath: string;
        userId: string | null;
        archivedVersion?: {
          versionNumber: number;
          snapshot: EmploymentContractRow;
          pdfUrl: string | null;
        };
        newVersion: number;
      }
    >({
      query: ({ contractId, storagePath, userId, archivedVersion, newVersion }) => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('publish_signed_employment_contract_pdf', {
            p_contract_id: contractId,
            p_storage_path: storagePath,
            p_new_version: newVersion,
            p_archived_version: archivedVersion?.versionNumber ?? null,
            p_archived_snapshot: archivedVersion?.snapshot ?? null,
            p_archived_pdf_url: archivedVersion?.pdfUrl ?? null,
            p_created_by: userId,
          });
          if (error) throw error;
          if (!data) throw new Error('Failed to publish signed contract PDF');
          return mapEmploymentContractRow(data as EmploymentContractRow);
        },
      }),
      invalidatesTags: (_r, _e, { officerId, contractId }) => [
        { type: 'EmploymentContracts', id: officerId },
        { type: 'EmploymentContracts', id: 'SELF' },
        { type: 'EmploymentContractVersions', id: contractId },
      ],
    }),

    deleteContractVersion: builder.mutation<
      void,
      { versionId: string; contractId: string; officerId: string; pdfUrl: string | null }
    >({
      query: ({ versionId, pdfUrl }) => ({
        handler: async (client) => {
          if (pdfUrl) {
            const storagePath = pdfUrl.replace(/^employment-contracts\//, '');
            const { error: storageError } = await client.storage
              .from('employment-contracts')
              .remove([storagePath]);
            if (storageError) {
              console.warn('Could not delete archived contract PDF from storage:', storageError.message);
            }
          }

          const { error } = await client
            .from('employment_contract_versions')
            .delete()
            .eq('id', versionId);
          if (error) throw error;
        },
      }),
      invalidatesTags: (_r, _e, { contractId }) => [
        { type: 'EmploymentContractVersions', id: contractId },
      ],
    }),
  }),
});

export const {
  useGetEmploymentContractQuery,
  useGetMyEmploymentContractQuery,
  useUpsertEmploymentContractDraftMutation,
  useFinalizeEmploymentContractMutation,
  useGetContractVersionsQuery,
  useGetCompanyContractDefaultsQuery,
  useSaveCompanyContractDefaultsMutation,
  useLazyGetContractSignedUrlQuery,
  useRequestEmployeeSignatureMutation,
  useSubmitContractSignatureMutation,
  useRegenerateSignedContractPdfMutation,
  useDeleteContractVersionMutation,
} = employmentContractsApi;

export { buildContractStoragePath, buildContractSignaturePath };
