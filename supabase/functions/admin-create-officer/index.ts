import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';
import { encryptPassword, generatePassword } from '../_shared/officerCredentials.ts';

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
  profilePhotoUrl: string;
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

function mimeFromUrl(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

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

    const frontUrl = photoIdFrontUrl?.trim() || idProofUrl?.trim();
    const backUrl = photoIdBackUrl?.trim() || addressProofUrl?.trim();

    if (!profilePhotoUrl?.trim() || !frontUrl || !backUrl) {
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
          date_of_birth: dateOfBirth || null,
          gender: gender?.trim() || null,
          blood_group: bloodGroup?.trim() || null,
          marital_status: maritalStatus?.trim() || null,
          current_address: currentAddress?.trim() || null,
          permanent_address: permanentAddress?.trim() || null,
          emergency_contact_name: ec1?.name?.trim() || null,
          emergency_contact_phone: ec1?.phone?.trim() || null,
          role_id: roleId || null,
          joining_date: joiningDate || contractStartDate || null,
          base_salary: basic || null,
          salary_config: salaryConfig,
          profile_photo_url: profilePhotoUrl.trim(),
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
          account_number: accountNumber?.trim() || null,
          ifsc_code: ifscCode?.trim() || null,
        });
        if (bankError) throw bankError;
      }

      const docEntries: { document_type: string; file_url: string }[] = [
        { document_type: 'profile_photo', file_url: profilePhotoUrl.trim() },
        { document_type: 'photo_id_front', file_url: frontUrl! },
        { document_type: 'photo_id_back', file_url: backUrl! },
      ];
      if (resumeUrl?.trim()) {
        docEntries.push({ document_type: 'resume', file_url: resumeUrl.trim() });
      }

      const { error: docsError } = await adminClient.from('officer_documents').insert(
        docEntries.map((doc) => ({
          officer_id: officerId,
          document_type: doc.document_type,
          file_url: doc.file_url,
          mime_type: mimeFromUrl(doc.file_url),
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

      await adminClient.from('officer_onboarding').insert({
        officer_id: officerId,
        status: 'completed',
        data: onboardingData,
      });

      if (contractType || contractStartDate || contractTerms) {
        await adminClient.from('officer_contracts').insert({
          officer_id: officerId,
          contract_type: contractType ?? 'Permanent',
          start_date: contractStartDate ?? joiningDate ?? null,
          terms: contractTerms ?? { salary: salaryConfig },
        });
      }

      const ciphertext = await encryptPassword(password!);
      await adminClient.from('officer_credentials').insert({
        officer_id: officerId,
        login_email: loginEmail,
        password_ciphertext: ciphertext,
        visible_to_admin: allowAdminViewPassword,
        password_set_method: passwordMode,
      });

      await adminClient.from('audit_logs').insert({
        actor_id: adminAuthUser?.id ?? null,
        action: 'officer_created',
        target_entity: officerId,
        new_values: { email: normalizedEmail, full_name: fullName.trim() },
        status: 'SUCCESS',
      });

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
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
