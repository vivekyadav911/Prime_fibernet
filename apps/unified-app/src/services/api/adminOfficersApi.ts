import type { InventoryItem, Payslip } from '@prime/types';
import type {
  AdminOfficerDetail,
  AdminOfficerStats,
  AdminOfficersListParams,
  CreateAdminOfficerInput,
  OfficerAccountStatus,
  OfficerRoleOption,
} from '@/types/api/admin';
import type {
  Contract,
  Officer,
  OfficerDocument,
  UpdateOfficerContactInput,
  UpdateOfficerContractInput,
  UpdateOfficerPersonalInput,
  UpdateOfficerRoleInput,
} from '@/types/api/officer';
import {
  mapFieldStatus,
  OFFICER_DOCUMENT_DEFINITIONS,
} from '@/types/api/officer';
import { parseOfficerDocumentStoragePath } from '@/utils/uploadOfficerDocument';

import { baseApi } from './baseApi';
import type { TypedSupabaseClient } from './supabase';
import { OFFICER_ADMIN_SELECT } from './mappers';

type OfficerRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  alternate_phone?: string | null;
  employee_id?: string | null;
  region?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  role_id?: string | null;
  joining_date?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  marital_status?: string | null;
  current_address?: string | null;
  permanent_address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  availability_status?: string | null;
  shift_status?: string | null;
  requests_completed?: number | null;
  avg_response_hours?: number | null;
  rating?: number | null;
  is_active?: boolean | null;
  is_blocked?: boolean | null;
  users?: { name?: string; email?: string; phone?: string } | null;
  officer_roles?: { name?: string } | null;
};

type OnboardingData = {
  emergencyContacts?: Array<{ name?: string; relationship?: string; phone?: string; address?: string }>;
  education?: {
    highestQualification?: string | null;
    university?: string | null;
    graduationYear?: string | null;
  };
  backgroundInfo?: {
    criminalRecord?: boolean;
    healthIssues?: boolean;
    details?: string | null;
  };
  positionApplied?: string | null;
  expectedSalary?: number | null;
  joiningDatePreference?: string | null;
  credentialsEmail?: string;
  passwordSetMethod?: 'auto' | 'manual';
  allowAdminView?: boolean;
};

function mapAccountStatus(row: OfficerRow): OfficerAccountStatus {
  if (row.is_blocked) return 'blocked';
  if (row.is_active === false) return 'inactive';
  return 'active';
}

function mapOfficerRow(row: OfficerRow): AdminOfficerDetail {
  const name =
    row.full_name ??
    (row.users as { name?: string } | null)?.name ??
    'Officer';
  const availabilityStatus = String(row.availability_status ?? 'offline');

  return {
    id: row.id,
    name,
    email:
      row.email ??
      (row.users as { email?: string } | null)?.email ??
      '',
    phone:
      row.phone ??
      (row.users as { phone?: string } | null)?.phone ??
      null,
    employeeId: row.employee_id ?? null,
    region: row.region ?? null,
    designation: (row.officer_roles as { name?: string } | null)?.name ?? null,
    accountStatus: mapAccountStatus(row),
    availabilityStatus,
    fieldStatus: mapFieldStatus(availabilityStatus),
    isActive: row.is_active !== false,
    isBlocked: row.is_blocked === true,
    status: availabilityStatus,
    shiftStatus: String(row.shift_status ?? 'off'),
    requestsCompleted: Number(row.requests_completed ?? 0),
    avgResponseHours: Number(row.avg_response_hours ?? 24),
    rating: Number(row.rating ?? 4),
  };
}

function parseOnboardingData(raw: unknown): OnboardingData {
  if (!raw || typeof raw !== 'object') return {};
  return raw as OnboardingData;
}

async function saveOfficerOnboardingData(
  client: TypedSupabaseClient,
  officerId: string,
  patch: Partial<OnboardingData>,
): Promise<void> {
  const { data: existing, error: fetchError } = await client
    .from('officer_onboarding')
    .select('id, data')
    .eq('officer_id', officerId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const nextData = { ...parseOnboardingData(existing?.data), ...patch };

  if (existing?.id) {
    const { error } = await client
      .from('officer_onboarding')
      .update({ data: nextData, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await client.from('officer_onboarding').insert({
    officer_id: officerId,
    data: nextData,
    status: 'completed',
  });
  if (error) throw error;
}

function mapOfficerProfile(
  row: OfficerRow,
  bank: {
    bank_name?: string | null;
    account_holder_name?: string | null;
    account_number?: string | null;
    ifsc_code?: string | null;
  } | null,
  onboarding: { data?: unknown } | null,
  creds: {
    login_email?: string;
    visible_to_admin?: boolean;
    password_set_method?: string;
    rotated_at?: string | null;
  } | null,
  permissions: string[],
): Officer {
  const onboardingData = parseOnboardingData(onboarding?.data);
  const ec1 = onboardingData.emergencyContacts?.[0];
  const ec2 = onboardingData.emergencyContacts?.[1];
  const legacyEc1 =
    row.emergency_contact_name || row.emergency_contact_phone
      ? {
          name: row.emergency_contact_name ?? '',
          relationship: '',
          phone: row.emergency_contact_phone ?? '',
          address: '',
        }
      : null;

  const emergencyContacts = [
    {
      name: ec1?.name ?? legacyEc1?.name ?? '',
      relationship: ec1?.relationship ?? legacyEc1?.relationship ?? '',
      phone: ec1?.phone ?? legacyEc1?.phone ?? '',
      address: ec1?.address ?? legacyEc1?.address ?? '',
    },
    {
      name: ec2?.name ?? '',
      relationship: ec2?.relationship ?? '',
      phone: ec2?.phone ?? '',
      address: ec2?.address ?? '',
    },
  ];

  const genderRaw = row.gender?.trim();
  const gender =
    genderRaw === 'Male' || genderRaw === 'Female' || genderRaw === 'Other'
      ? genderRaw
      : genderRaw
        ? (genderRaw.charAt(0).toUpperCase() + genderRaw.slice(1).toLowerCase() as 'Male' | 'Female' | 'Other')
        : null;

  return {
    id: row.id,
    fullName: row.full_name ?? (row.users as { name?: string } | null)?.name ?? 'Officer',
    email: row.email ?? (row.users as { email?: string } | null)?.email ?? '',
    phone: row.phone ?? (row.users as { phone?: string } | null)?.phone ?? '',
    alternatePhone: row.alternate_phone ?? null,
    roleId: row.role_id ?? null,
    role: (row.officer_roles as { name?: string } | null)?.name ?? null,
    designation: (row.officer_roles as { name?: string } | null)?.name ?? null,
    department: null,
    city: row.city ?? null,
    status: mapAccountStatus(row),
    fieldStatus: mapFieldStatus(row.availability_status),
    joiningDate: row.joining_date ?? null,
    currentAddress: row.current_address ?? null,
    permanentAddress: row.permanent_address ?? null,
    state: row.state ?? null,
    pincode: row.pincode ?? null,
    region: row.region ?? null,
    dateOfBirth: row.date_of_birth ?? null,
    gender,
    bloodGroup: row.blood_group ?? null,
    maritalStatus: row.marital_status ?? null,
    bankDetails: {
      bankName: bank?.bank_name ?? null,
      accountHolderName: bank?.account_holder_name ?? null,
      accountNumber: bank?.account_number ?? null,
      ifscCode: bank?.ifsc_code ?? null,
    },
    emergencyContacts,
    education: {
      highestQualification: onboardingData.education?.highestQualification ?? null,
      university: onboardingData.education?.university ?? null,
      graduationYear: onboardingData.education?.graduationYear ?? null,
    },
    backgroundInfo: {
      criminalRecord: onboardingData.backgroundInfo?.criminalRecord ?? false,
      healthIssues: onboardingData.backgroundInfo?.healthIssues ?? false,
      details: onboardingData.backgroundInfo?.details ?? null,
    },
    positionApplied: onboardingData.positionApplied ?? null,
    expectedSalary: onboardingData.expectedSalary ?? null,
    joiningDatePreference: onboardingData.joiningDatePreference ?? null,
    permissions,
    credentials: creds
      ? {
          loginEmail: creds.login_email ?? row.email ?? '',
          passwordSetMethod: (creds.password_set_method as 'auto' | 'manual') ?? 'auto',
          visibleToAdmin: creds.visible_to_admin === true,
          lastPasswordRotatedAt: creds.rotated_at ?? null,
        }
      : null,
  };
}

function mapContractRow(
  row: {
    id: string;
    contract_type?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    terms?: Record<string, unknown> | null;
  },
  bank: {
    bank_name?: string | null;
    account_holder_name?: string | null;
    account_number?: string | null;
    ifsc_code?: string | null;
  } | null,
): Contract {
  const terms = (row.terms ?? {}) as Record<string, unknown>;
  const salaryRaw = (terms.salary ?? {}) as Record<string, number>;
  const basic = Number(salaryRaw.basic ?? salaryRaw.base_salary ?? 0);
  const hra = Number(salaryRaw.hra ?? 0);
  const transport = Number(salaryRaw.transportAllowance ?? salaryRaw.transport_allowance ?? 0);
  const other = Number(salaryRaw.otherAllowances ?? salaryRaw.other_allowances ?? 0);
  const benefitsRaw = (terms.benefits ?? {}) as Record<string, boolean>;

  return {
    id: row.id,
    contractNumber: (terms.contractNumber as string) ?? null,
    contractType: (row.contract_type as Contract['contractType']) ?? 'Permanent',
    status: (terms.status as Contract['status']) ?? 'Active',
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    position: (terms.position as string) ?? null,
    designation: (terms.designation as string) ?? null,
    department: (terms.department as string) ?? null,
    reportingTo: (terms.reportingTo as string) ?? null,
    workLocation: (terms.workLocation as string) ?? null,
    workingHoursPerDay: terms.workingHoursPerDay != null ? Number(terms.workingHoursPerDay) : null,
    weeklyOffDays: terms.weeklyOffDays != null ? Number(terms.weeklyOffDays) : null,
    leaveEntitlementPerYear:
      terms.leaveEntitlementPerYear != null ? Number(terms.leaveEntitlementPerYear) : null,
    salary: {
      basic,
      hra,
      transportAllowance: transport,
      otherAllowances: other,
      total: basic + hra + transport + other,
    },
    bankDetails: {
      bankName: bank?.bank_name ?? null,
      accountHolderName: bank?.account_holder_name ?? null,
      accountNumber: bank?.account_number ?? null,
      ifscCode: bank?.ifsc_code ?? null,
    },
    benefits: {
      healthInsurance: benefitsRaw.healthInsurance ?? false,
      pfApplicable: benefitsRaw.pfApplicable ?? false,
      esicApplicable: benefitsRaw.esicApplicable ?? false,
    },
  };
}

type OfficerDocumentRow = {
  id: string;
  document_type: string;
  file_url?: string | null;
  storage_path?: string | null;
  display_name?: string | null;
  mime_type?: string | null;
  uploaded_at?: string;
};

function resolveDocumentStoragePath(row: OfficerDocumentRow): string | undefined {
  if (row.storage_path?.trim()) return row.storage_path.trim();
  if (row.file_url?.trim()) {
    return parseOfficerDocumentStoragePath(row.file_url) ?? undefined;
  }
  return undefined;
}

function mapDocuments(rows: OfficerDocumentRow[]): OfficerDocument[] {
  const standardRows = rows.filter((r) => r.document_type !== 'additional');
  const additionalRows = rows.filter((r) => r.document_type === 'additional');
  const byType = new Map(standardRows.map((r) => [r.document_type, r]));

  const standardDocs = OFFICER_DOCUMENT_DEFINITIONS.map((def) => {
    const row = byType.get(def.dbType) ?? byType.get(
      def.dbType === 'photo_id_front' ? 'id_proof' : def.dbType === 'photo_id_back' ? 'address_proof' : def.dbType,
    );
    const storagePath = row ? resolveDocumentStoragePath(row) : undefined;
    return {
      id: row?.id ?? def.type,
      type: def.type,
      label: row?.display_name?.trim() || def.label,
      required: def.required,
      status: storagePath ? 'uploaded' as const : 'not_uploaded' as const,
      url: row?.file_url ?? undefined,
      storagePath,
      displayName: row?.display_name ?? def.label,
      isAdditional: false,
      mimeType: row?.mime_type,
      uploadedAt: row?.uploaded_at,
    };
  });

  const additionalDocs = additionalRows.map((row) => {
    const storagePath = resolveDocumentStoragePath(row);
    return {
      id: row.id,
      type: 'ADDITIONAL' as const,
      label: row.display_name?.trim() || 'Additional Document',
      required: false,
      status: storagePath ? 'uploaded' as const : 'not_uploaded' as const,
      url: row.file_url ?? undefined,
      storagePath,
      displayName: row.display_name ?? 'Additional Document',
      isAdditional: true,
      mimeType: row.mime_type,
      uploadedAt: row.uploaded_at,
    };
  });

  return [...standardDocs, ...additionalDocs];
}

const OFFICER_SELECT = OFFICER_ADMIN_SELECT;

export const adminOfficersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminOfficerStats: builder.query<AdminOfficerStats, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('officers')
            .select('is_active, is_blocked, availability_status');
          if (error) throw error;

          const rows = data ?? [];
          return {
            total: rows.length,
            active: rows.filter((r) => r.is_active !== false && !r.is_blocked).length,
            available: rows.filter(
              (r) => r.availability_status === 'available' && r.is_active !== false && !r.is_blocked,
            ).length,
            restricted: rows.filter((r) => r.is_blocked === true).length,
          };
        },
      }),
      providesTags: ['Officers'],
    }),

    getAdminOfficers: builder.query<AdminOfficerDetail[], AdminOfficersListParams | void>({
      query: (filters) => ({
        handler: async (client) => {
          let query = client.from('officers').select(OFFICER_SELECT);

          if (filters?.accountStatus && filters.accountStatus !== 'all') {
            if (filters.accountStatus === 'blocked') {
              query = query.eq('is_blocked', true);
            } else if (filters.accountStatus === 'active') {
              query = query.eq('is_active', true).eq('is_blocked', false);
            } else if (filters.accountStatus === 'inactive') {
              query = query.eq('is_active', false);
            }
          }

          const { data, error } = await query.order('created_at', { ascending: false });
          if (error) throw error;

          let items = (data ?? []).map((row) => mapOfficerRow(row as OfficerRow));

          const search = filters?.search?.trim().toLowerCase();
          if (search) {
            items = items.filter(
              (o) =>
                o.name.toLowerCase().includes(search) ||
                o.email.toLowerCase().includes(search) ||
                (o.phone ?? '').toLowerCase().includes(search) ||
                (o.region ?? '').toLowerCase().includes(search) ||
                (o.designation ?? '').toLowerCase().includes(search),
            );
          }

          return items;
        },
      }),
      providesTags: ['Officers'],
    }),

    getAdminOfficerDetail: builder.query<AdminOfficerDetail, string>({
      query: (officerId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('officers')
            .select(OFFICER_SELECT)
            .eq('id', officerId)
            .maybeSingle();
          if (error) throw error;
          if (!data) throw new Error('Officer not found');
          return mapOfficerRow(data as OfficerRow);
        },
      }),
      providesTags: (_r, _e, id) => [{ type: 'Officers', id }],
    }),

    getOfficerProfile: builder.query<Officer, string>({
      query: (officerId) => ({
        handler: async (client) => {
          const { data: row, error } = await client
            .from('officers')
            .select(OFFICER_SELECT)
            .eq('id', officerId)
            .maybeSingle();
          if (error) throw error;
          if (!row) throw new Error('Officer not found');

          const [{ data: bank }, { data: onboarding }, { data: creds }] = await Promise.all([
            client.from('officer_bank_details').select('*').eq('officer_id', officerId).maybeSingle(),
            client.from('officer_onboarding').select('data').eq('officer_id', officerId).maybeSingle(),
            client.from('officer_credentials').select('login_email, visible_to_admin, password_set_method, rotated_at').eq('officer_id', officerId).maybeSingle(),
          ]);

          let permissions: string[] = [];
          const roleId = (row as OfficerRow).role_id;
          if (roleId) {
            const { data: perms } = await client
              .from('officer_role_permissions')
              .select('permission')
              .eq('role_id', roleId);
            permissions = (perms ?? []).map((p) => String(p.permission));
          }

          return mapOfficerProfile(row as OfficerRow, bank, onboarding, creds, permissions);
        },
      }),
      providesTags: (_r, _e, id) => [{ type: 'Officers', id }],
    }),

    getOfficerContract: builder.query<Contract | null, string>({
      query: (officerId) => ({
        handler: async (client) => {
          const [{ data: contract }, { data: bank }] = await Promise.all([
            client.from('officer_contracts').select('*').eq('officer_id', officerId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
            client.from('officer_bank_details').select('*').eq('officer_id', officerId).maybeSingle(),
          ]);
          if (!contract) return null;
          return mapContractRow(contract as Parameters<typeof mapContractRow>[0], bank);
        },
      }),
      providesTags: (_r, _e, id) => [{ type: 'Officers', id: `${id}-contract` }],
    }),

    getOfficerDocuments: builder.query<OfficerDocument[], string>({
      query: (officerId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('officer_documents')
            .select('id, document_type, file_url, storage_path, display_name, mime_type, uploaded_at')
            .eq('officer_id', officerId)
            .order('uploaded_at', { ascending: true });
          if (error) throw error;
          return mapDocuments((data ?? []) as OfficerDocumentRow[]);
        },
      }),
      providesTags: (_r, _e, id) => [{ type: 'Officers', id: `${id}-documents` }],
    }),

    getOfficerDocumentSignedUrl: builder.query<string, { storagePath: string; expirySeconds?: number }>({
      query: ({ storagePath, expirySeconds = 3600 }) => ({
        handler: async (client) => {
          const { data, error } = await client.storage
            .from('officer-documents')
            .createSignedUrl(storagePath, expirySeconds);
          if (error) throw error;
          if (!data?.signedUrl) throw new Error('Could not create signed URL');
          return data.signedUrl;
        },
      }),
    }),

    getOfficerRolePermissions: builder.query<string[], string>({
      query: (roleId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('officer_role_permissions')
            .select('permission')
            .eq('role_id', roleId);
          if (error) throw error;
          return (data ?? []).map((r) => String(r.permission));
        },
      }),
      providesTags: ['Officers'],
    }),

    getOfficerRoles: builder.query<OfficerRoleOption[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('officer_roles')
            .select('id, name, description')
            .order('name');
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            name: row.name as string,
            description: (row.description as string) ?? null,
          }));
        },
      }),
      providesTags: ['Officers'],
    }),

    createAdminOfficer: builder.mutation<
      { officerId: string; authUserId: string; generatedPassword?: string; loginEmail?: string },
      CreateAdminOfficerInput
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('admin-create-officer', { body });
          if (error) throw error;
          const result = data as {
            officerId?: string;
            authUserId?: string;
            generatedPassword?: string;
            loginEmail?: string;
            error?: string;
          };
          if (result.error) throw new Error(result.error);
          if (!result.officerId || !result.authUserId) {
            throw new Error('Officer creation failed');
          }
          return {
            officerId: result.officerId,
            authUserId: result.authUserId,
            generatedPassword: result.generatedPassword,
            loginEmail: result.loginEmail,
          };
        },
      }),
      invalidatesTags: ['Officers'],
    }),

    updateOfficerPersonal: builder.mutation<void, { id: string } & UpdateOfficerPersonalInput>({
      query: ({ id, education, backgroundInfo, positionApplied, expectedSalary, joiningDatePreference, ...fields }) => ({
        handler: async (client) => {
          const updates: Record<string, unknown> = {};
          if (fields.fullName !== undefined) updates.full_name = fields.fullName;
          if (fields.dateOfBirth !== undefined) updates.date_of_birth = fields.dateOfBirth || null;
          if (fields.gender !== undefined) updates.gender = fields.gender || null;
          if (fields.bloodGroup !== undefined) updates.blood_group = fields.bloodGroup || null;
          if (fields.maritalStatus !== undefined) updates.marital_status = fields.maritalStatus || null;

          if (Object.keys(updates).length) {
            const { error } = await client.from('officers').update(updates).eq('id', id);
            if (error) throw error;
          }

          const onboardingPatch: Partial<OnboardingData> = {};
          if (education !== undefined) onboardingPatch.education = education;
          if (backgroundInfo !== undefined) onboardingPatch.backgroundInfo = backgroundInfo;
          if (positionApplied !== undefined) onboardingPatch.positionApplied = positionApplied;
          if (expectedSalary !== undefined) onboardingPatch.expectedSalary = expectedSalary;
          if (joiningDatePreference !== undefined) {
            onboardingPatch.joiningDatePreference = joiningDatePreference;
          }

          if (Object.keys(onboardingPatch).length) {
            await saveOfficerOnboardingData(client, id, onboardingPatch);
          }
        },
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Officers', id }, 'Officers'],
    }),

    updateOfficerContact: builder.mutation<void, { id: string } & UpdateOfficerContactInput>({
      query: ({ id, bankDetails, emergencyContacts, ...fields }) => ({
        handler: async (client) => {
          const updates: Record<string, unknown> = {};
          if (fields.email !== undefined) updates.email = fields.email;
          if (fields.phone !== undefined) updates.phone = fields.phone;
          if (fields.alternatePhone !== undefined) updates.alternate_phone = fields.alternatePhone || null;
          if (fields.currentAddress !== undefined) updates.current_address = fields.currentAddress || null;
          if (fields.permanentAddress !== undefined) updates.permanent_address = fields.permanentAddress || null;
          if (fields.city !== undefined) updates.city = fields.city || null;
          if (fields.state !== undefined) updates.state = fields.state || null;
          if (fields.pincode !== undefined) updates.pincode = fields.pincode || null;
          if (fields.region !== undefined) updates.region = fields.region || null;

          if (Object.keys(updates).length) {
            const { error } = await client.from('officers').update(updates).eq('id', id);
            if (error) throw error;
          }

          if (bankDetails) {
            await client.from('officer_bank_details').upsert({
              officer_id: id,
              bank_name: bankDetails.bankName,
              account_holder_name: bankDetails.accountHolderName,
              account_number: bankDetails.accountNumber,
              ifsc_code: bankDetails.ifscCode,
              updated_at: new Date().toISOString(),
            });
          }

          if (emergencyContacts) {
            await saveOfficerOnboardingData(client, id, { emergencyContacts });
          }
        },
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Officers', id }, 'Officers'],
    }),

    updateOfficerContract: builder.mutation<void, { id: string } & UpdateOfficerContractInput>({
      query: ({ id, contractType, startDate, endDate, terms }) => ({
        handler: async (client) => {
          const { data: existing } = await client
            .from('officer_contracts')
            .select('id, terms')
            .eq('officer_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const mergedTerms = { ...(existing?.terms as Record<string, unknown> ?? {}), ...(terms ?? {}) };

          if (existing?.id) {
            await client.from('officer_contracts').update({
              contract_type: contractType ?? undefined,
              start_date: startDate ?? undefined,
              end_date: endDate ?? undefined,
              terms: mergedTerms,
            }).eq('id', existing.id);
          } else {
            await client.from('officer_contracts').insert({
              officer_id: id,
              contract_type: contractType ?? 'Permanent',
              start_date: startDate ?? null,
              end_date: endDate ?? null,
              terms: mergedTerms,
            });
          }
        },
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Officers', id: `${id}-contract` }],
    }),

    updateOfficerRole: builder.mutation<void, { id: string } & UpdateOfficerRoleInput>({
      query: ({ id, roleId, joiningDate }) => ({
        handler: async (client) => {
          const updates: Record<string, unknown> = { role_id: roleId };
          if (joiningDate !== undefined) updates.joining_date = joiningDate || null;
          const { error } = await client.from('officers').update(updates).eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Officers', id }, 'Officers'],
    }),

    updateAdminOfficer: builder.mutation<
      void,
      { id: string; region?: string; employeeId?: string; availabilityStatus?: string }
    >({
      query: ({ id, employeeId, region, availabilityStatus }) => ({
        handler: async (client) => {
          const updates: Record<string, unknown> = {};
          if (region !== undefined) updates.region = region;
          if (employeeId !== undefined) updates.employee_id = employeeId;
          if (availabilityStatus !== undefined) updates.availability_status = availabilityStatus;
          const { error } = await client.from('officers').update(updates).eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Officers'],
    }),

    blockOfficer: builder.mutation<void, { officerId: string; reason: string }>({
      query: ({ officerId, reason }) => ({
        handler: async (client) => {
          const { data: officer } = await client
            .from('officers')
            .select('user_id, auth_user_id')
            .eq('id', officerId)
            .maybeSingle();

          const userId = (officer?.user_id ?? officer?.auth_user_id) as string | undefined;
          if (userId) {
            await client.from('users').update({ is_blocked: true }).eq('id', userId);
          }
          await client.from('officers').update({ is_blocked: true }).eq('id', officerId);

          await client.from('audit_logs').insert({
            action: 'officer_blocked',
            target_entity: officerId,
            new_values: { reason },
            status: 'SUCCESS',
          });
        },
      }),
      async onQueryStarted({ officerId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminOfficersApi.util.updateQueryData('getAdminOfficers', undefined, (draft) => {
            const item = draft.find((o) => o.id === officerId);
            if (item) {
              item.isBlocked = true;
              item.accountStatus = 'blocked';
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ['Officers'],
    }),

    unblockOfficer: builder.mutation<void, { officerId: string }>({
      query: ({ officerId }) => ({
        handler: async (client) => {
          const { data: officer } = await client
            .from('officers')
            .select('user_id, auth_user_id, is_active')
            .eq('id', officerId)
            .maybeSingle();

          const userId = (officer?.user_id ?? officer?.auth_user_id) as string | undefined;
          if (userId) {
            await client.from('users').update({ is_blocked: false }).eq('id', userId);
          }
          await client.from('officers').update({ is_blocked: false }).eq('id', officerId);

          await client.from('audit_logs').insert({
            action: 'officer_unblocked',
            target_entity: officerId,
            status: 'SUCCESS',
          });
        },
      }),
      async onQueryStarted({ officerId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminOfficersApi.util.updateQueryData('getAdminOfficers', undefined, (draft) => {
            const item = draft.find((o) => o.id === officerId);
            if (item) {
              item.isBlocked = false;
              item.accountStatus = item.isActive ? 'active' : 'inactive';
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ['Officers'],
    }),

    deleteOfficer: builder.mutation<void, { officerId: string }>({
      query: ({ officerId }) => ({
        handler: async (client) => {
          const { error } = await client.from('officers').delete().eq('id', officerId);
          if (error) throw error;
          await client.from('audit_logs').insert({
            action: 'officer_deleted',
            target_entity: officerId,
            status: 'SUCCESS',
          });
        },
      }),
      invalidatesTags: ['Officers'],
    }),

    uploadOfficerDocument: builder.mutation<
      void,
      {
        officerId: string;
        documentType: string;
        storagePath: string;
        mimeType?: string | null;
        displayName?: string;
      }
    >({
      query: ({ officerId, documentType, storagePath, mimeType, displayName }) => ({
        handler: async (client) => {
          const def = OFFICER_DOCUMENT_DEFINITIONS.find((d) => d.dbType === documentType);
          const label = displayName ?? def?.label ?? documentType;

          const { data: existing } = await client
            .from('officer_documents')
            .select('id, storage_path')
            .eq('officer_id', officerId)
            .eq('document_type', documentType)
            .maybeSingle();

          if (existing?.id) {
            const { error } = await client.from('officer_documents').update({
              storage_path: storagePath,
              mime_type: mimeType ?? null,
              display_name: label,
              uploaded_at: new Date().toISOString(),
            }).eq('id', existing.id);
            if (error) throw error;
          } else {
            const { error } = await client.from('officer_documents').insert({
              officer_id: officerId,
              document_type: documentType,
              storage_path: storagePath,
              mime_type: mimeType ?? null,
              display_name: label,
            });
            if (error) throw error;
          }

          if (documentType === 'profile_photo') {
            const { data: signed } = await client.storage
              .from('officer-documents')
              .createSignedUrl(storagePath, 604800);
            await client
              .from('officers')
              .update({ profile_photo_url: signed?.signedUrl ?? storagePath })
              .eq('id', officerId);
          }
        },
      }),
      invalidatesTags: (_r, _e, { officerId }) => [{ type: 'Officers', id: `${officerId}-documents` }],
    }),

    uploadAdditionalOfficerDocument: builder.mutation<
      { documentId: string },
      {
        officerId: string;
        storagePath: string;
        displayName: string;
        mimeType?: string | null;
      }
    >({
      query: ({ officerId, storagePath, displayName, mimeType }) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('officer_documents')
            .insert({
              officer_id: officerId,
              document_type: 'additional',
              storage_path: storagePath,
              display_name: displayName.trim(),
              mime_type: mimeType ?? null,
            })
            .select('id')
            .single();
          if (error) throw error;
          return { documentId: data.id as string };
        },
      }),
      invalidatesTags: (_r, _e, { officerId }) => [{ type: 'Officers', id: `${officerId}-documents` }],
    }),

    deleteOfficerDocument: builder.mutation<void, { officerId: string; documentId: string; storagePath?: string }>({
      query: ({ documentId, storagePath }) => ({
        handler: async (client) => {
          let pathToDelete = storagePath;
          if (!pathToDelete) {
            const { data: row } = await client
              .from('officer_documents')
              .select('storage_path, file_url')
              .eq('id', documentId)
              .maybeSingle();
            if (row) {
              pathToDelete = resolveDocumentStoragePath(row as OfficerDocumentRow);
            }
          }

          if (pathToDelete) {
            const { error: storageError } = await client.storage
              .from('officer-documents')
              .remove([pathToDelete]);
            if (storageError) throw storageError;
          }

          const { error } = await client.from('officer_documents').delete().eq('id', documentId);
          if (error) throw error;
        },
      }),
      invalidatesTags: (_r, _e, { officerId }) => [{ type: 'Officers', id: `${officerId}-documents` }],
    }),

    revealOfficerPassword: builder.mutation<
      { loginEmail: string; password: string },
      { officerId: string }
    >({
      query: ({ officerId }) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('admin-reveal-officer-password', {
            body: { officerId },
          });
          if (error) throw error;
          const result = data as { loginEmail?: string; password?: string; error?: string };
          if (result.error) throw new Error(result.error);
          if (!result.password) throw new Error('Could not reveal password');
          return { loginEmail: result.loginEmail ?? '', password: result.password };
        },
      }),
    }),

    resetOfficerPassword: builder.mutation<
      { loginEmail: string; password: string },
      { officerId: string; newPassword?: string }
    >({
      query: ({ officerId, newPassword }) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('admin-reset-officer-password', {
            body: { officerId, newPassword },
          });
          if (error) throw error;
          const result = data as { loginEmail?: string; password?: string; error?: string };
          if (result.error) throw new Error(result.error);
          if (!result.password) throw new Error('Password reset failed');
          return { loginEmail: result.loginEmail ?? '', password: result.password };
        },
      }),
      invalidatesTags: (_r, _e, { officerId }) => [{ type: 'Officers', id: officerId }],
    }),

    getOfficerPerformance: builder.query<
      { requestsCompleted: number; avgResponseHours: number; rating: number },
      string
    >({
      query: (officerId) => ({
        handler: async (client) => {
          const { data, error } = await client.from('officers').select('*').eq('id', officerId).maybeSingle();
          if (error) throw error;
          return {
            requestsCompleted: Number(data?.requests_completed ?? 0),
            avgResponseHours: Number(data?.avg_response_hours ?? 24),
            rating: Number(data?.rating ?? 4),
          };
        },
      }),
      providesTags: ['Officers'],
    }),

    getOfficerPayslips: builder.query<Payslip[], string>({
      query: (officerId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('payslips')
            .select('*')
            .eq('officer_id', officerId)
            .order('month', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            officerId: row.officer_id as string,
            month: row.month as string,
            base: Number(row.base),
            bonuses: Number(row.bonuses),
            deductions: Number(row.deductions),
            netPay: Number(row.net_pay),
            pdfUrl: (row.pdf_url as string) ?? null,
          }));
        },
      }),
      providesTags: ['Payslips'],
    }),

    getOfficerAssignedInventory: builder.query<InventoryItem[], string>({
      query: (officerId) => ({
        handler: async (client) => {
          const { data: assignments } = await client
            .from('inventory_assignments')
            .select('item_id')
            .eq('assigned_to_id', officerId)
            .eq('status', 'assigned');
          const itemIds = (assignments ?? []).map((a) => a.item_id).filter(Boolean) as string[];
          if (!itemIds.length) return [];
          const { data, error } = await client.from('inventory_items').select('*').in('id', itemIds);
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            name: row.name as string,
            sku: (row.sku as string) ?? null,
            category: (row.category as string) ?? null,
            quantity: Number(row.quantity ?? 0),
            status: String(row.status ?? 'available'),
          }));
        },
      }),
      providesTags: ['Inventory'],
    }),
  }),
});

export const {
  useGetAdminOfficerStatsQuery,
  useGetAdminOfficersQuery,
  useGetAdminOfficerDetailQuery,
  useGetOfficerProfileQuery,
  useGetOfficerContractQuery,
  useGetOfficerDocumentsQuery,
  useLazyGetOfficerDocumentSignedUrlQuery,
  useGetOfficerRolePermissionsQuery,
  useGetOfficerRolesQuery,
  useCreateAdminOfficerMutation,
  useUpdateOfficerPersonalMutation,
  useUpdateOfficerContactMutation,
  useUpdateOfficerContractMutation,
  useUpdateOfficerRoleMutation,
  useUpdateAdminOfficerMutation,
  useBlockOfficerMutation,
  useUnblockOfficerMutation,
  useDeleteOfficerMutation,
  useUploadOfficerDocumentMutation,
  useUploadAdditionalOfficerDocumentMutation,
  useDeleteOfficerDocumentMutation,
  useRevealOfficerPasswordMutation,
  useResetOfficerPasswordMutation,
  useGetOfficerPerformanceQuery,
  useGetOfficerPayslipsQuery,
  useGetOfficerAssignedInventoryQuery,
} = adminOfficersApi;
