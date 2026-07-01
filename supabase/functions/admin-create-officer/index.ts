import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';
import { encryptPassword, generatePassword } from '../_shared/officerCredentials.ts';
import { encryptValue } from '../_shared/officerPii.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

type EmergencyContact = {
  name?: string;
  relationship?: string;
  phone?: string;
  address?: string;
};

type Education = {
  highestQualification?: string;
  university?: string;
  graduationYear?: string;
};

type BackgroundInfo = {
  criminalRecord?: boolean;
  healthIssues?: boolean;
  details?: string;
};

type SalaryBreakdown = {
  basic?: number;
  hra?: number;
  transportAllowance?: number;
  otherAllowances?: number;
};

type ContractTerms = {
  contractNumber?: string;
  status?: string;
  position?: string;
  designation?: string;
  department?: string;
  reportingTo?: string;
  workLocation?: string;
  workingHoursPerDay?: number;
  weeklyOffDays?: number;
  leaveEntitlementPerYear?: number;
  salary?: SalaryBreakdown;
  benefits?: {
    healthInsurance?: boolean;
    pfApplicable?: boolean;
    esicApplicable?: boolean;
  };
};

type CreateOfficerBody = {
  fullName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  region?: string;
  city?: string;
  state?: string;
  pincode?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  currentAddress?: string;
  permanentAddress?: string;
  emergencyContacts?: EmergencyContact[];
  roleId?: string;
  joiningDate?: string;
  baseSalary?: number;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  profilePhotoStoragePath?: string;
  photoIdFrontStoragePath?: string;
  photoIdBackStoragePath?: string;
  resumeStoragePath?: string;
  profilePhotoUrl?: string;
  photoIdFrontUrl?: string;
  photoIdBackUrl?: string;
  resumeUrl?: string;
  idProofUrl?: string;
  addressProofUrl?: string;
  password?: string;
  passwordMode?: 'auto' | 'manual';
  credentialsEmail?: string;
  allowAdminViewPassword?: boolean;
  contractType?: string;
  contractStartDate?: string;
  contractTerms?: ContractTerms;
  education?: Education;
  backgroundInfo?: BackgroundInfo;
  positionApplied?: string;
  expectedSalary?: number;
  joiningDatePreference?: string;
};

function mimeFromPath(path: string): string | null {
  const lower = path.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

function parseStoragePath(fileUrlOrPath: string): string | null {
  const trimmed = fileUrlOrPath.trim();
  if (!trimmed) return null;

  const marker = '/officer-documents/';
  const idx = trimmed.indexOf(marker);
  if (idx >= 0) {
    return decodeURIComponent(trimmed.slice(idx + marker.length).split('?')[0] ?? '');
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed;
  }

  return null;
}

function resolveDocumentPath(
  storagePath: string | undefined,
  legacyUrl: string | undefined,
): string | null {
  if (storagePath?.trim()) return storagePath.trim();
  if (legacyUrl?.trim()) return parseStoragePath(legacyUrl);
  return null;
}

function normalizeDate(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function formatThrownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return String(error);
}

async function copyDocumentToOfficerFolder(
  adminClient: ReturnType<typeof createClient>,
  sourcePath: string,
  officerId: string,
  documentType: string,
): Promise<string> {
  const ext = sourcePath.split('.').pop() ?? 'jpg';
  const destPath = `${officerId}/${documentType}.${ext}`;

  if (sourcePath.startsWith(`${officerId}/`)) {
    return sourcePath;
  }

  const { data: blob, error: downloadError } = await adminClient.storage
    .from('officer-documents')
    .download(sourcePath);
  if (downloadError) throw downloadError;
  if (!blob) throw new Error(`Could not read document at ${sourcePath}`);

  const { error: uploadError } = await adminClient.storage
    .from('officer-documents')
    .upload(destPath, blob, {
      upsert: true,
      contentType: mimeFromPath(destPath) ?? undefined,
    });
  if (uploadError) throw uploadError;

  if (sourcePath.startsWith('pending/')) {
    await adminClient.storage.from('officer-documents').remove([sourcePath]);
  }

  return destPath;
}

const DOCUMENT_LABELS: Record<string, string> = {
  profile_photo: 'Profile Photo',
  photo_id_front: 'Photo ID - Front Side',
  photo_id_back: 'Photo ID - Back Side',
  resume: 'Resume/CV',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization');

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isAdmin, error: rpcError } = await userClient.rpc('is_admin_user');
    if (rpcError) throw rpcError;
    const { data: { user: adminAuthUser } } = await userClient.auth.getUser();
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as CreateOfficerBody;
    const {
      fullName,
      email,
      phone,
      alternatePhone,
      region,
      city,
      state,
      pincode,
      dateOfBirth,
      gender,
      bloodGroup,
      maritalStatus,
      currentAddress,
      permanentAddress,
      emergencyContacts,
      roleId,
      joiningDate,
      baseSalary,
      bankName,
      accountHolderName,
      accountNumber,
      ifscCode,
      profilePhotoStoragePath,
      photoIdFrontStoragePath,
      photoIdBackStoragePath,
      resumeStoragePath,
      profilePhotoUrl,
      photoIdFrontUrl,
      photoIdBackUrl,
      resumeUrl,
      idProofUrl,
      addressProofUrl,
      passwordMode = 'auto',
      credentialsEmail,
      allowAdminViewPassword = false,
      contractType,
      contractStartDate,
      contractTerms,
      education,
      backgroundInfo,
      positionApplied,
      expectedSalary,
      joiningDatePreference,
    } = body;

    let { password } = body;

    if (!fullName?.trim() || !email?.trim() || !phone?.trim()) {
      throw new Error('fullName, email, and phone are required');
    }

    const profilePath = resolveDocumentPath(profilePhotoStoragePath, profilePhotoUrl);
    const frontPath = resolveDocumentPath(
      photoIdFrontStoragePath,
      photoIdFrontUrl?.trim() || idProofUrl?.trim(),
    );
    const backPath = resolveDocumentPath(
      photoIdBackStoragePath,
      photoIdBackUrl?.trim() || addressProofUrl?.trim(),
    );
    const resumePath = resolveDocumentPath(resumeStoragePath, resumeUrl);

    if (!profilePath || !frontPath || !backPath) {
      throw new Error('Profile photo, photo ID front, and photo ID back are required');
    }

    if (passwordMode === 'manual') {
      if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
    } else {
      password = generatePassword();
    }

    const normalizedEmail = email.trim().toLowerCase();
    const loginEmail = (credentialsEmail?.trim() || normalizedEmail).toLowerCase();

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (existingUser) throw new Error('A user with this email already exists');

    const { data: existingOfficer } = await adminClient
      .from('officers')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (existingOfficer) throw new Error('An officer with this email already exists');

    if (roleId) {
      const { data: role } = await adminClient
        .from('officer_roles')
        .select('id')
        .eq('id', roleId)
        .maybeSingle();
      if (!role) throw new Error('Selected role is not available');
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: password!,
      email_confirm: true,
      user_metadata: {
        name: fullName.trim(),
        phone: phone.trim(),
        role: 'officer',
        app_role: 'officer',
      },
    });

    if (createError) throw createError;
    if (!created?.user?.id) throw new Error('Auth user not created');

    const authUid = created.user.id;
    const salary = contractTerms?.salary ?? {};
    const basic = salary.basic ?? baseSalary ?? 0;
    const salaryConfig = {
      base_salary: basic,
      hra: salary.hra ?? 0,
      transport_allowance: salary.transportAllowance ?? 0,
      other_allowances: salary.otherAllowances ?? 0,
      total: basic + (salary.hra ?? 0) + (salary.transportAllowance ?? 0) + (salary.otherAllowances ?? 0),
    };

    const ec1 = emergencyContacts?.[0];
    const ec2 = emergencyContacts?.[1];

    try {
      const { error: updateUserError } = await adminClient
        .from('users')
        .update({
          name: fullName.trim(),
          phone: phone.trim(),
          role: 'officer',
          auth_user_id: authUid,
          is_blocked: false,
        })
        .eq('id', authUid);

      if (updateUserError) throw updateUserError;

      const { data: officerRow, error: officerError } = await adminClient
        .from('officers')
        .insert({
          user_id: authUid,
          auth_user_id: authUid,
          full_name: fullName.trim(),
          email: normalizedEmail,
          phone: phone.trim(),
          alternate_phone: alternatePhone?.trim() || null,
          region: region?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          pincode: pincode?.trim() || null,
          date_of_birth: normalizeDate(dateOfBirth),
          gender: gender?.trim() || null,
          blood_group: bloodGroup?.trim() || null,
          marital_status: maritalStatus?.trim() || null,
          current_address: currentAddress?.trim() || null,
          permanent_address: permanentAddress?.trim() || null,
          emergency_contact_name: ec1?.name?.trim() || null,
          emergency_contact_phone: ec1?.phone?.trim() || null,
          role_id: roleId || null,
          joining_date: normalizeDate(joiningDate) ?? normalizeDate(contractStartDate),
          base_salary: basic || null,
          salary_config: salaryConfig,
          profile_photo_url: null,
          availability_status: 'offline',
          is_active: true,
          is_blocked: false,
        })
        .select('id')
        .single();

      if (officerError) throw officerError;
      const officerId = officerRow.id as string;

      if (bankName?.trim() || accountHolderName?.trim() || accountNumber?.trim() || ifscCode?.trim()) {
        const { error: bankError } = await adminClient.from('officer_bank_details').insert({
          officer_id: officerId,
          bank_name: bankName?.trim() || null,
          account_holder_name: accountHolderName?.trim() || null,
          account_number: await encryptValue(accountNumber?.trim() || null),
          ifsc_code: await encryptValue(ifscCode?.trim() || null),
        });
        if (bankError) throw bankError;
      }

      const docSources: { document_type: string; sourcePath: string }[] = [
        { document_type: 'profile_photo', sourcePath: profilePath },
        { document_type: 'photo_id_front', sourcePath: frontPath },
        { document_type: 'photo_id_back', sourcePath: backPath },
      ];
      if (resumePath) {
        docSources.push({ document_type: 'resume', sourcePath: resumePath });
      }

      const docEntries: {
        document_type: string;
        storage_path: string;
        display_name: string;
        mime_type: string | null;
      }[] = [];

      for (const doc of docSources) {
        const storagePath = await copyDocumentToOfficerFolder(
          adminClient,
          doc.sourcePath,
          officerId,
          doc.document_type,
        );
        docEntries.push({
          document_type: doc.document_type,
          storage_path: storagePath,
          display_name: DOCUMENT_LABELS[doc.document_type] ?? doc.document_type,
          mime_type: mimeFromPath(storagePath),
        });
      }

      const profileDoc = docEntries.find((d) => d.document_type === 'profile_photo');
      if (profileDoc) {
        const { data: signed } = await adminClient.storage
          .from('officer-documents')
          .createSignedUrl(profileDoc.storage_path, 604800);
        await adminClient
          .from('officers')
          .update({ profile_photo_url: signed?.signedUrl ?? profileDoc.storage_path })
          .eq('id', officerId);
      }

      const { error: docsError } = await adminClient.from('officer_documents').insert(
        docEntries.map((doc) => ({
          officer_id: officerId,
          document_type: doc.document_type,
          storage_path: doc.storage_path,
          display_name: doc.display_name,
          file_url: null,
          mime_type: doc.mime_type,
        })),
      );
      if (docsError) throw docsError;

      const onboardingData = {
        created_by: 'admin',
        credentialsEmail: loginEmail,
        passwordSetMethod: passwordMode,
        allowAdminView: allowAdminViewPassword,
        emergencyContacts: emergencyContacts ?? [],
        education: education ?? {},
        backgroundInfo: backgroundInfo ?? {},
        positionApplied: positionApplied ?? null,
        expectedSalary: expectedSalary ?? null,
        joiningDatePreference: joiningDatePreference ?? null,
      };

      const { error: onboardingError } = await adminClient.from('officer_onboarding').insert({
        officer_id: officerId,
        status: 'completed',
        data: onboardingData,
      });
      if (onboardingError) throw onboardingError;

      if (contractType || normalizeDate(contractStartDate) || contractTerms) {
        const { error: contractError } = await adminClient.from('officer_contracts').insert({
          officer_id: officerId,
          contract_type: contractType ?? 'Permanent',
          start_date: normalizeDate(contractStartDate) ?? normalizeDate(joiningDate),
          terms: contractTerms ?? { salary: salaryConfig },
        });
        if (contractError) throw contractError;
      }

      const ciphertext = await encryptPassword(password!);
      const { error: credentialsError } = await adminClient.from('officer_credentials').insert({
        officer_id: officerId,
        login_email: loginEmail,
        password_ciphertext: ciphertext,
        visible_to_admin: allowAdminViewPassword,
        password_set_method: passwordMode,
      });
      if (credentialsError) throw credentialsError;

      const { data: auditActor } = adminAuthUser?.id
        ? await adminClient.from('users').select('id').eq('id', adminAuthUser.id).maybeSingle()
        : { data: null };

      const { error: auditError } = await adminClient.from('audit_logs').insert({
        actor_id: auditActor?.id ?? null,
        action: 'officer_created',
        target_entity: officerId,
        new_values: { email: normalizedEmail, full_name: fullName.trim() },
        status: 'SUCCESS',
      });
      if (auditError) {
        console.error('audit_logs insert failed:', auditError.message);
      }

      return new Response(
        JSON.stringify({
          officerId,
          authUserId: authUid,
          generatedPassword: passwordMode === 'auto' ? password : undefined,
          loginEmail,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (dbError) {
      await adminClient.auth.admin.deleteUser(authUid);
      throw dbError;
    }
  } catch (e) {
    const msg = formatThrownError(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
