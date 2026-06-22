/**
 * Employment contract PDF generation via expo-print (Expo managed workflow).
 * Bare RN alternative: react-native-html-to-pdf + react-native-share (requires dev client).
 *
 * LEGAL NOTE: Template language is not legal advice — review with counsel before use.
 */
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';

import type { CompanyDefaults, EmploymentContract } from '@/types/contract';
import { formatCurrencyInrPrecise } from '@/utils/formatCurrency';

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentContract['employmentType'], string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Fixed-term Contract',
  probation: 'Probation',
  intern: 'Internship',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtMoney(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return formatCurrencyInrPrecise(amount);
}

function buildReferenceNumber(contract: EmploymentContract): string {
  const year = new Date(contract.dateOfJoining).getFullYear();
  return `EMP-${contract.officerId.slice(0, 8).toUpperCase()}-${year}`;
}

function employmentTypeLabel(type: EmploymentContract['employmentType']): string {
  return EMPLOYMENT_TYPE_LABELS[type];
}

function boolLabel(value: boolean): string {
  return value ? 'Applicable' : 'Not applicable';
}

function partyRow(label: string, value: string | null | undefined): string {
  if (!value?.trim()) return '';
  return `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value.trim())}</td></tr>`;
}

const SIGNATURE_STATUS_LABELS: Record<EmploymentContract['signatureStatus'], string> = {
  unsigned: 'Unsigned',
  employee_signed: 'Employee signed — awaiting employer',
  employer_signed: 'Employer signed — awaiting employee',
  fully_signed: 'Fully executed',
};

function buildPartiesSection(): string {
  return `
  <table class="comp">
    <thead><tr><th colspan="2">Company (Employer)</th></tr></thead>
    <tbody>__COMPANY_ROWS__</tbody>
    <thead><tr><th colspan="2">Employee</th></tr></thead>
    <tbody>__EMPLOYEE_ROWS__</tbody>
  </table>`;
}

function renderNumberedSections(sections: { title: string; html: string }[], startAt = 1): string {
  return sections
    .map((section, index) => {
      const number = startAt + index;
      return `<h3>${number}. ${escapeHtml(section.title)}</h3>\n${section.html}`;
    })
    .join('\n\n');
}

function buildExecutionSection(contract: EmploymentContract): string {
  const status = SIGNATURE_STATUS_LABELS[contract.signatureStatus];
  const requestSent = contract.signatureRequestSentAt
    ? fmtDate(contract.signatureRequestSentAt)
    : null;
  return `
  <h3>Execution &amp; Signatures</h3>
  <table class="comp">
    <tbody>
      <tr><td>Document Version</td><td>v${contract.version}</td></tr>
      <tr><td>Contract Status</td><td>${escapeHtml(contract.status)}</td></tr>
      <tr><td>Signature Status</td><td>${escapeHtml(status)}</td></tr>
      ${requestSent ? `<tr><td>Signature Request Sent</td><td>${escapeHtml(requestSent)}</td></tr>` : ''}
      ${contract.employeeSignedAt ? `<tr><td>Employee Signed</td><td>${escapeHtml(fmtDate(contract.employeeSignedAt))}</td></tr>` : ''}
      ${contract.employerSignedAt ? `<tr><td>Employer Signed</td><td>${escapeHtml(fmtDate(contract.employerSignedAt))}</td></tr>` : ''}
    </tbody>
  </table>`;
}

type SignatureImages = {
  /** Local file URI (file://) for expo-print embedding. */
  employee?: string;
  employer?: string;
};

function signatureImageHtml(fileUri: string | undefined): string {
  if (!fileUri) {
    return '<div style="height:56px;border-bottom:1px solid #222;margin-bottom:8px;"></div>';
  }
  const safeSrc = fileUri.replace(/"/g, '&quot;');
  return `<img src="${safeSrc}" alt="Signature" width="180" height="56" style="max-height:56px;max-width:180px;display:block;margin-bottom:8px;object-fit:contain;" />`;
}

function signatureBlock(
  label: string,
  fileUri: string | undefined,
  name: string,
  designation: string,
  signedAt: string | null | undefined,
): string {
  const dateLine = signedAt ? fmtDate(signedAt) : '_______________';
  return `
    <p><strong>${escapeHtml(label)}</strong></p>
    ${signatureImageHtml(fileUri)}
    <p style="font-size:10pt;margin:0;">
      ${escapeHtml(name)}<br/>
      ${escapeHtml(designation)}<br/>
      Date: ${signedAt ? escapeHtml(dateLine) : dateLine}
    </p>
  `;
}

export function generateContractHTML(
  contract: EmploymentContract,
  companyDefaults: CompanyDefaults | null,
  signatureImages?: SignatureImages,
): string {
  const refNo = buildReferenceNumber(contract);
  const today = fmtDate(new Date().toISOString());
  const logoUrl = companyDefaults?.logoUrl;

  const companyRows = [
    partyRow('Legal Name', contract.companyName),
    partyRow('Registered Address', contract.companyAddress),
    partyRow('CIN', contract.companyCin),
    partyRow('PAN', contract.companyPan),
    partyRow('Authorized Signatory', contract.authorizedSignatoryName),
    partyRow('Signatory Designation', contract.authorizedSignatoryDesignation),
  ].join('');

  const employeeRows = [
    partyRow('Full Name', contract.employeeFullName),
    partyRow('Residential Address', contract.employeeAddress),
    partyRow('Mobile', contract.employeePhone),
    partyRow('Email', contract.employeeEmail),
    partyRow('PAN', contract.employeePan),
    partyRow('Aadhaar (last 4 digits)', contract.employeeAadhaarLast4),
    partyRow('Designation', contract.employeeDesignation),
    partyRow('Department', contract.employeeDepartment),
    partyRow('Reporting Manager', contract.reportingManager),
  ].join('');

  const partiesTable = buildPartiesSection()
    .replace('__COMPANY_ROWS__', companyRows)
    .replace('__EMPLOYEE_ROWS__', employeeRows);

  const contractEndLine =
    contract.employmentType === 'contract' && contract.contractEndDate
      ? `<p>This fixed-term contract shall expire on ${fmtDate(contract.contractEndDate)} unless extended in writing by the Company.</p>`
      : '';

  const sections: { title: string; html: string }[] = [
    {
      title: 'Parties',
      html: partiesTable,
    },
    {
      title: 'Appointment & Designation',
      html: `<p>The Company hereby appoints the Employee as <strong>${escapeHtml(contract.employeeDesignation)}</strong>${contract.employeeDepartment ? ` in the ${escapeHtml(contract.employeeDepartment)} department` : ''}, on a ${escapeHtml(employmentTypeLabel(contract.employmentType))} basis${contract.reportingManager ? `, reporting to ${escapeHtml(contract.reportingManager)}` : ''}.</p>`,
    },
    {
      title: 'Date of Commencement',
      html: `<p>The Employee's employment shall commence on <strong>${fmtDate(contract.dateOfJoining)}</strong>.</p>${contractEndLine}`,
    },
    {
      title: 'Place of Work',
      html: `<p>The primary place of work shall be <strong>${escapeHtml(contract.workLocation)}</strong>. The Company may require the Employee to work at other locations or remotely as business needs require.</p>`,
    },
    {
      title: 'Compensation & Benefits',
      html: `<p>The Employee's Cost to Company (CTC) is <strong>${fmtMoney(contract.ctcAnnual)}</strong> per annum. The indicative monthly salary breakdown is as follows:</p>
  <table class="comp">
    <thead><tr><th>Component</th><th>Monthly Amount (INR)</th></tr></thead>
    <tbody>
      <tr><td>Basic Salary</td><td class="amount">${fmtMoney(contract.basicSalaryMonthly)}</td></tr>
      <tr><td>House Rent Allowance (HRA)</td><td class="amount">${fmtMoney(contract.hraMonthly)}</td></tr>
      <tr><td>Special Allowance</td><td class="amount">${fmtMoney(contract.specialAllowanceMonthly)}</td></tr>
      <tr><td>Employer PF Contribution</td><td class="amount">${fmtMoney(contract.pfEmployerContribution)}</td></tr>
      <tr><td><strong>Approx. Monthly Gross</strong></td><td class="amount"><strong>${fmtMoney(contract.ctcAnnual / 12)}</strong></td></tr>
    </tbody>
  </table>
  <p>Salary shall be paid on ${escapeHtml(contract.salaryPaymentDate)}. ${escapeHtml(contract.bonusTerms ?? '')} ${escapeHtml(contract.salaryRevisionClause)}</p>
  <p>Gratuity: ${contract.gratuityApplicable ? 'Applicable as per Payment of Gratuity Act, 1972.' : 'Not applicable under current terms.'}</p>`,
    },
    {
      title: 'Working Hours & Leave',
      html: `<p>Working days: ${contract.workingDaysPerWeek} days per week. Working hours: ${escapeHtml(contract.workingHoursPerDay)}. Weekly off: ${escapeHtml(contract.weeklyOff)}.</p>
  <p>${escapeHtml(contract.leavePolicy ?? 'Leave entitlement as per company policy.')}</p>`,
    },
  ];

  if (contract.probationPeriodMonths > 0) {
    sections.push({
      title: 'Probation',
      html: `<p>The Employee shall be on probation for a period of ${contract.probationPeriodMonths} month(s) from the Date of Commencement. During probation, either party may terminate employment by giving ${contract.noticePeriodProbationDays} days' written notice or salary in lieu thereof, subject to applicable law.</p>`,
    });
  }

  sections.push(
    {
      title: 'Confidentiality',
      html: `<p>${escapeHtml(contract.confidentialityClause ?? DEFAULT_CONFIDENTIALITY)}</p>`,
    },
    {
      title: 'Intellectual Property',
      html: `<p>${escapeHtml(contract.ipAssignmentClause ?? DEFAULT_IP)}</p>`,
    },
    {
      title: 'Termination & Notice Period',
      html: `<p>After completion of probation (if any), either party may terminate this Agreement by giving <strong>${contract.noticePeriodDays} days</strong> written notice or payment in lieu thereof.</p>
  <p>${escapeHtml(contract.terminationClause ?? '')}</p>
  <p>${escapeHtml(contract.resignationClause ?? '')}</p>`,
    },
    {
      title: 'Statutory Compliance',
      html: `<p>Provident Fund (PF): ${boolLabel(contract.pfApplicable)}. Employee State Insurance (ESI): ${boolLabel(contract.esiApplicable)}. Professional Tax: ${boolLabel(contract.professionalTaxApplicable)}. Tax Deducted at Source (TDS): ${boolLabel(contract.tdsApplicable)}.</p>`,
    },
    {
      title: 'Governing Law & Jurisdiction',
      html: `<p>This Agreement shall be governed by the laws of India. Courts at ${escapeHtml(contract.governingLawJurisdiction)} shall have exclusive jurisdiction.</p>`,
    },
  );

  if (contract.nonCompeteMonths > 0 && contract.nonCompeteClause) {
    const ipIndex = sections.findIndex((s) => s.title === 'Intellectual Property');
    sections.splice(ipIndex, 0, {
      title: 'Non-Compete',
      html: `<p>${escapeHtml(contract.nonCompeteClause)} Duration: ${contract.nonCompeteMonths} month(s) after cessation of employment, subject to applicable law including Section 27 of the Indian Contract Act, 1872.</p>`,
    });
  }

  for (const clause of contract.customClauses) {
    sections.push({
      title: clause.title,
      html: `<p>${escapeHtml(clause.body)}</p>`,
    });
  }

  const numberedSectionsHtml = renderNumberedSections(sections);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 72px; }
    body {
      font-family: Georgia, 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.55;
      color: #111;
    }
    .letterhead { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #222; padding-bottom: 12px; }
    .letterhead img { max-height: 56px; margin-bottom: 8px; }
    .company-name { font-size: 18pt; font-weight: 700; margin: 0; }
    .company-address { font-size: 10pt; color: #333; margin-top: 4px; }
    .doc-title { text-align: center; font-size: 14pt; font-weight: 700; letter-spacing: 1px; margin: 24px 0 16px; text-transform: uppercase; }
    .meta { font-size: 10pt; margin-bottom: 20px; }
    h3 { font-size: 11.5pt; font-weight: 700; margin: 18px 0 8px; }
    p { margin: 0 0 10px; text-align: justify; }
    table.comp { width: 100%; border-collapse: collapse; margin: 12px 0 16px; font-size: 10.5pt; }
    table.comp th, table.comp td { border: 1px solid #444; padding: 8px 10px; }
    table.comp th { background: #f5f5f5; text-align: left; }
    table.comp td.amount { text-align: right; font-variant-numeric: tabular-nums; }
    .signatures { margin-top: 48px; display: table; width: 100%; }
    .sig-col { display: table-cell; width: 50%; vertical-align: top; padding-right: 16px; }
    .sig-line { border-top: 1px solid #222; margin-top: 48px; padding-top: 6px; font-size: 10pt; }
  </style>
</head>
<body>
  <div class="letterhead">
    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Company logo" />` : ''}
    <p class="company-name">${escapeHtml(contract.companyName)}</p>
    <p class="company-address">${escapeHtml(contract.companyAddress)}</p>
    ${contract.companyCin ? `<p class="company-address">CIN: ${escapeHtml(contract.companyCin)}</p>` : ''}
  </div>

  <p class="doc-title">Employment Contract / Letter of Appointment</p>

  <div class="meta">
    <p><strong>Reference:</strong> ${escapeHtml(refNo)} &nbsp;|&nbsp; <strong>Version:</strong> v${contract.version} &nbsp;|&nbsp; <strong>Date:</strong> ${escapeHtml(today)}</p>
    ${contract.companyPan ? `<p><strong>Company PAN:</strong> ${escapeHtml(contract.companyPan)}</p>` : ''}
  </div>

  <p>This Employment Contract ("Agreement") is entered into between <strong>${escapeHtml(contract.companyName)}</strong> ("the Company"), having its registered office at ${escapeHtml(contract.companyAddress)}, and <strong>${escapeHtml(contract.employeeFullName)}</strong> ("the Employee")${contract.employeeAddress ? `, residing at ${escapeHtml(contract.employeeAddress)}` : ''}, on ${escapeHtml(today)}.</p>

  ${numberedSectionsHtml}

  ${buildExecutionSection(contract)}

  <div class="signatures">
    <div class="sig-col">
      ${signatureBlock(
        `For ${contract.companyName}`,
        signatureImages?.employer,
        contract.authorizedSignatoryName,
        contract.authorizedSignatoryDesignation,
        contract.employerSignedAt,
      )}
    </div>
    <div class="sig-col">
      ${signatureBlock(
        'Employee',
        signatureImages?.employee,
        contract.employeeFullName,
        contract.employeeDesignation,
        contract.employeeSignedAt,
      )}
    </div>
  </div>
</body>
</html>`;
}

const DEFAULT_CONFIDENTIALITY =
  'The Employee shall maintain confidentiality of all Company information during and after employment.';

const DEFAULT_IP =
  'All work product created during employment relating to the Company business belongs to the Company.';

export async function generateContractPDF(
  contract: EmploymentContract,
  companyDefaults: CompanyDefaults | null,
  signatureImages?: SignatureImages,
): Promise<string> {
  const html = generateContractHTML(contract, companyDefaults, signatureImages);
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error('PDF generation failed — file was not created');
  }
  if ('size' in info && typeof info.size === 'number' && info.size < 100) {
    throw new Error('PDF generation failed — output file is empty');
  }

  return uri;
}

export function contractPdfFileName(contract: EmploymentContract): string {
  const safeName = contract.employeeFullName.replace(/\s+/g, '_').replace(/[^\w-]/g, '');
  return `contract_${safeName}_v${contract.version}.pdf`;
}
