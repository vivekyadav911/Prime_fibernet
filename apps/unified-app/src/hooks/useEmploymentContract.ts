import { useCallback } from 'react';

import { useContractPDF } from '@/hooks/useContractPDF';
import {
  useFinalizeEmploymentContractMutation,
  useGetContractVersionsQuery,
  useGetEmploymentContractQuery,
  useGetMyEmploymentContractQuery,
  useDeleteContractVersionMutation,
  useRegenerateSignedContractPdfMutation,
  useRequestEmployeeSignatureMutation,
  useSubmitContractSignatureMutation,
  useUpsertEmploymentContractDraftMutation,
} from '@/services/api/employmentContractsApi';
import { useAppSelector } from '@/store/hooks';
import type {
  CompanyDefaults,
  ContractFormValues,
  ContractSignerRole,
  EmploymentContract,
  EmploymentContractRow,
} from '@/types/contract';
import {
  contractToFormValues,
  employmentContractToRow,
  formValuesToContractRow,
  mapEmploymentContractRow,
} from '@/types/contract';

async function regeneratePdfWithSignatures(
  updated: EmploymentContract,
  companyDefaults: CompanyDefaults | null,
  deps: {
    loadSignatureImages: (
      contract: EmploymentContract,
      freshSignatures?: Partial<{ employee: string; employer: string }>,
    ) => Promise<{ employee?: string; employer?: string }>;
    generatePDF: (
      contract: EmploymentContract,
      defaults: CompanyDefaults | null,
      images?: { employee?: string; employer?: string },
    ) => Promise<string>;
    uploadToStorage: (
      localPath: string,
      officerId: string,
      contractId: string,
      version: number,
    ) => Promise<string>;
    regeneratePdfMutation: (args: {
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
    }) => Promise<EmploymentContract>;
    userId: string | null;
  },
  freshSignatures?: Partial<{ employee: string; employer: string }>,
): Promise<EmploymentContract> {
  if (!updated.generatedPdfUrl) {
    return updated;
  }

  const signatureImages = await deps.loadSignatureImages(updated, freshSignatures);
  const archivedVersion = {
    versionNumber: updated.version,
    snapshot: employmentContractToRow(updated),
    pdfUrl: updated.generatedPdfUrl,
  };
  const newVersion = updated.version + 1;
  const localPdfPath = await deps.generatePDF(updated, companyDefaults, signatureImages);
  const storagePath = await deps.uploadToStorage(
    localPdfPath,
    updated.officerId,
    updated.id,
    newVersion,
  );

  return deps.regeneratePdfMutation({
    contractId: updated.id,
    officerId: updated.officerId,
    storagePath,
    userId: deps.userId,
    archivedVersion,
    newVersion,
  });
}

export function useEmploymentContract(officerId: string, options?: { skip?: boolean }) {
  const userId = useAppSelector((s) => s.auth.user?.id ?? null);
  const { data: contract, isLoading, isError, error, refetch } = useGetEmploymentContractQuery(
    officerId,
    { skip: options?.skip ?? !officerId },
  );
  const [upsertDraft, { isLoading: savingDraft }] = useUpsertEmploymentContractDraftMutation();
  const [finalizeContract, { isLoading: finalizing }] = useFinalizeEmploymentContractMutation();
  const [requestSignature, { isLoading: requestingSignature }] = useRequestEmployeeSignatureMutation();
  const [submitSignatureMutation, { isLoading: submittingSignature }] =
    useSubmitContractSignatureMutation();
  const [regeneratePdfMutation, { isLoading: regeneratingPdf }] =
    useRegenerateSignedContractPdfMutation();
  const { generatePDF, uploadToStorage, uploadSignature, loadSignatureImages } = useContractPDF();

  const saveDraft = useCallback(
    async (values: ContractFormValues) => {
      return upsertDraft({ values, userId }).unwrap();
    },
    [upsertDraft, userId],
  );

  const generateAndSaveContract = useCallback(
    async (
      values: ContractFormValues,
      existing: EmploymentContract | null,
      companyDefaults: CompanyDefaults | null,
    ) => {
      let contractId = values.contractId ?? existing?.id;
      let archivedVersion:
        | { versionNumber: number; snapshot: EmploymentContractRow; pdfUrl: string | null }
        | undefined;

      if (existing?.generatedPdfUrl) {
        archivedVersion = {
          versionNumber: existing.version,
          snapshot: employmentContractToRow(existing),
          pdfUrl: existing.generatedPdfUrl,
        };
      }

      const draftSaved = await upsertDraft({ values: { ...values, contractId }, userId }).unwrap();
      contractId = draftSaved.id;
      const newVersion = archivedVersion ? existing!.version + 1 : Math.max(draftSaved.version, 1);

      const rowPayload = formValuesToContractRow(
        { ...values, contractId },
        'generated',
        userId,
      );
      const contractForPdf: EmploymentContract = {
        ...mapEmploymentContractRow({
          ...(rowPayload as Parameters<typeof mapEmploymentContractRow>[0]),
          id: contractId,
          version: newVersion,
          generated_pdf_url: null,
          created_at: draftSaved.createdAt,
          updated_at: new Date().toISOString(),
        }),
        employeeSignaturePath: draftSaved.employeeSignaturePath,
        employeeSignatureBase64: draftSaved.employeeSignatureBase64,
        employerSignaturePath: draftSaved.employerSignaturePath,
        employerSignatureBase64: draftSaved.employerSignatureBase64,
        employeeSignedAt: draftSaved.employeeSignedAt,
        employerSignedAt: draftSaved.employerSignedAt,
        signatureStatus: draftSaved.signatureStatus,
      };

      const signatureImages = await loadSignatureImages(contractForPdf);
      const localPdfPath = await generatePDF(contractForPdf, companyDefaults, signatureImages);
      const storagePath = await uploadToStorage(
        localPdfPath,
        values.officerId,
        contractId,
        newVersion,
      );

      return finalizeContract({
        values: { ...values, contractId },
        userId,
        storagePath,
        archivedVersion,
        newVersion,
      }).unwrap();
    },
    [upsertDraft, userId, generatePDF, uploadToStorage, finalizeContract, loadSignatureImages],
  );

  const submitContractSignature = useCallback(
    async (
      current: EmploymentContract,
      role: ContractSignerRole,
      signatureBase64: string,
      companyDefaults: CompanyDefaults | null,
    ) => {
      if (!userId) throw new Error('You must be signed in to submit a signature');

      const { storagePath, signatureBase64: normalizedBase64 } = await uploadSignature(
        current.id,
        current.officerId,
        role,
        signatureBase64,
      );

      const updated = await submitSignatureMutation({
        contractId: current.id,
        officerId: current.officerId,
        role,
        signaturePath: storagePath,
        signatureBase64: normalizedBase64,
        userId,
      }).unwrap();

      return regeneratePdfWithSignatures(
        updated,
        companyDefaults,
        {
          loadSignatureImages,
          generatePDF,
          uploadToStorage,
          regeneratePdfMutation: (args) => regeneratePdfMutation(args).unwrap(),
          userId,
        },
        { [role]: normalizedBase64 },
      );
    },
    [
      userId,
      uploadSignature,
      submitSignatureMutation,
      loadSignatureImages,
      generatePDF,
      uploadToStorage,
      regeneratePdfMutation,
    ],
  );

  const requestEmployeeSignature = useCallback(
    async (contractId: string) => {
      return requestSignature({ contractId, officerId }).unwrap();
    },
    [requestSignature, officerId],
  );

  return {
    contract,
    isLoading,
    isError,
    error,
    refetch,
    saveDraft,
    generateAndSaveContract,
    submitContractSignature,
    requestEmployeeSignature,
    savingDraft,
    finalizing,
    requestingSignature,
    submittingSignature: submittingSignature || regeneratingPdf,
    contractToFormValues,
  };
}

export function useMyEmploymentContract() {
  const userId = useAppSelector((s) => s.auth.user?.id ?? null);
  const { data: contract, isLoading, isError, error, refetch } = useGetMyEmploymentContractQuery();
  const [submitSignatureMutation, { isLoading: submittingSignature }] =
    useSubmitContractSignatureMutation();
  const [regeneratePdfMutation, { isLoading: regeneratingPdf }] =
    useRegenerateSignedContractPdfMutation();
  const { generatePDF, uploadToStorage, uploadSignature, loadSignatureImages } = useContractPDF();

  const submitMySignature = useCallback(
    async (current: EmploymentContract, signatureBase64: string, companyDefaults: CompanyDefaults | null) => {
      if (!userId) throw new Error('You must be signed in to submit a signature');

      const { storagePath, signatureBase64: normalizedBase64 } = await uploadSignature(
        current.id,
        current.officerId,
        'employee',
        signatureBase64,
      );

      const updated = await submitSignatureMutation({
        contractId: current.id,
        officerId: current.officerId,
        role: 'employee',
        signaturePath: storagePath,
        signatureBase64: normalizedBase64,
        userId,
      }).unwrap();

      const result = await regeneratePdfWithSignatures(
        updated,
        companyDefaults,
        {
          loadSignatureImages,
          generatePDF,
          uploadToStorage,
          regeneratePdfMutation: (args) => regeneratePdfMutation(args).unwrap(),
          userId,
        },
        { employee: normalizedBase64 },
      );
      await refetch();
      return result;
    },
    [
      userId,
      uploadSignature,
      submitSignatureMutation,
      loadSignatureImages,
      generatePDF,
      uploadToStorage,
      regeneratePdfMutation,
      refetch,
    ],
  );

  return {
    contract,
    isLoading,
    isError,
    error,
    refetch,
    submitMySignature,
    submittingSignature: submittingSignature || regeneratingPdf,
  };
}

export function useContractVersionHistory(
  contractId: string,
  officerId: string,
  options?: { skip?: boolean },
) {
  const { data: versions = [], isLoading, refetch } = useGetContractVersionsQuery(contractId, {
    skip: options?.skip ?? !contractId,
  });
  const [deleteVersionMutation, { isLoading: deletingVersion }] = useDeleteContractVersionMutation();
  const { shareFromStoragePath } = useContractPDF();

  const downloadVersion = useCallback(
    async (pdfUrl: string | null) => {
      if (!pdfUrl) throw new Error('PDF not available for this version');
      await shareFromStoragePath(pdfUrl);
    },
    [shareFromStoragePath],
  );

  const deleteVersion = useCallback(
    async (version: { id: string; pdfUrl: string | null }) => {
      await deleteVersionMutation({
        versionId: version.id,
        contractId,
        officerId,
        pdfUrl: version.pdfUrl,
      }).unwrap();
      await refetch();
    },
    [contractId, deleteVersionMutation, officerId, refetch],
  );

  return {
    versions,
    isLoading,
    refetch,
    downloadVersion,
    deleteVersion,
    deletingVersion,
  };
}
