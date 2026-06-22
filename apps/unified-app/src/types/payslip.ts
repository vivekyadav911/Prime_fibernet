// Payslip module types — hourly-rate payroll from shifts attendance (read-only input).

export const PAYSLIP_STATUSES = [
  'draft',
  'pending_review',
  'approved',
  'paid',
  'cancelled',
] as const;

export type PayslipStatus = (typeof PAYSLIP_STATUSES)[number];

export const LINE_ITEM_TYPES = ['addition', 'deduction'] as const;

export type LineItemType = (typeof LINE_ITEM_TYPES)[number];

export type EmployeeCompensation = {
  id: string;
  officerId: string;
  monthlySalary: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type PayTypeRule = {
  id: string;
  attendanceStatus: string;
  payFraction: number;
  usesScheduledHours: boolean;
  description: string | null;
  updatedAt: string;
};

export type AttendanceLabelThreshold = {
  id: string;
  label: string;
  minHoursFraction: number;
  maxHoursFraction: number | null;
  sortOrder: number;
  updatedAt: string;
};

export type CompanyHoliday = {
  id: string;
  holidayDate: string;
  name: string;
  appliesToAll: boolean;
  createdBy: string | null;
  createdAt: string;
};

export type PayslipLineItem = {
  id: string;
  payslipId: string;
  itemType: LineItemType;
  label: string;
  amount: number;
  notes: string | null;
  addedBy: string | null;
  createdAt: string;
};

export type PayslipDailyBreakdown = {
  id: string;
  payslipId: string;
  date: string;
  attendanceRecordId: string | null;
  isScheduledWorkingDay: boolean;
  actualHours: number;
  displayLabel: string;
  dayPay: number;
  hourlyRateApplied: number | null;
  createdAt: string;
};

export type Payslip = {
  id: string;
  officerId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payPeriodLabel: string;
  companyName: string;
  companyAddress: string;
  companyLogoUrl: string | null;
  employeeName: string;
  employeeDesignation: string;
  employeeIdDisplay: string | null;
  employeeDepartment: string | null;
  bankAccountLast4: string | null;
  hourlyRate: number;
  totalScheduledDays: number;
  totalWorkedDays: number;
  totalActualHours: number;
  grossEarnings: number;
  totalAdditions: number;
  totalDeductions: number;
  netPay: number;
  status: PayslipStatus;
  generatedPdfUrl: string | null;
  authorizedBy: string | null;
  authorizedSignatureName: string | null;
  authorizedAt: string | null;
  generatedBy: string | null;
  negativePayOverrideNote: string | null;
  createdAt: string;
  updatedAt: string;
  dailyBreakdown?: PayslipDailyBreakdown[];
  lineItems?: PayslipLineItem[];
  officerName?: string;
  weeklyOffDays?: number[];
};

export type PayslipCalculationDay = {
  date: string;
  attendanceRecordId: string | null;
  isScheduledWorkingDay: boolean;
  actualHours: number;
  displayLabel: string;
  dayPay: number;
  hourlyRateApplied: number;
};

export type PayslipCalculationResult = {
  payslipId: string | null;
  blocked: boolean;
  blockingDates: string[];
  grossEarnings: number;
  netPay: number;
  hourlyRate: number;
  totalScheduledDays: number;
  totalWorkedDays: number;
  totalActualHours: number;
  dailyBreakdown: PayslipCalculationDay[];
  rateChangeDates?: string[];
};

export type CalendarDayCell = {
  date: string;
  day: number;
  displayLabel: string;
  actualHours: number;
  dayPay: number;
  isScheduledWorkingDay: boolean;
  colorKey:
    | 'present'
    | 'half_day'
    | 'quarter_day'
    | 'partial'
    | 'absent'
    | 'weekly_off'
    | 'holiday'
    | 'leave'
    | 'extra';
};

export type PayrollDashboardEntry = {
  officerId: string;
  officerName: string;
  payslipId: string | null;
  status: PayslipStatus | 'not_started';
  netPayPreview: number | null;
  blocked: boolean;
  blockingDates: string[];
};

export type GeneratePayslipInput = {
  officerId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  forceOverwriteDraft?: boolean;
};

// ─── DB row mappers ───────────────────────────────────────────────────────────

export type DbEmployeeCompensationRow = {
  id: string;
  officer_id: string;
  monthly_salary: number;
  effective_from: string;
  effective_to: string | null;
  created_by: string | null;
  created_at: string;
};

export type DbPayTypeRuleRow = {
  id: string;
  attendance_status: string;
  pay_fraction: number;
  uses_scheduled_hours: boolean;
  description: string | null;
  updated_at: string;
};

export type DbAttendanceLabelThresholdRow = {
  id: string;
  label: string;
  min_hours_fraction: number;
  max_hours_fraction: number | null;
  sort_order: number;
  updated_at: string;
};

export type DbCompanyHolidayRow = {
  id: string;
  holiday_date: string;
  name: string;
  applies_to_all: boolean;
  created_by: string | null;
  created_at: string;
};

export type DbPayslipRow = {
  id: string;
  officer_id: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_period_label: string;
  company_name: string;
  company_address: string;
  company_logo_url: string | null;
  employee_name: string;
  employee_designation: string;
  employee_id_display: string | null;
  employee_department: string | null;
  bank_account_last4: string | null;
  hourly_rate: number;
  total_scheduled_days: number;
  total_worked_days: number;
  total_actual_hours: number;
  gross_earnings: number;
  total_additions: number;
  total_deductions: number;
  net_pay: number;
  status: PayslipStatus;
  generated_pdf_url: string | null;
  authorized_by: string | null;
  authorized_signature_name: string | null;
  authorized_at: string | null;
  generated_by: string | null;
  negative_pay_override_note: string | null;
  created_at: string;
  updated_at: string;
  officers?: { full_name?: string };
  payslip_daily_breakdown?: DbPayslipDailyBreakdownRow[];
  payslip_line_items?: DbPayslipLineItemRow[];
};

export type DbPayslipDailyBreakdownRow = {
  id: string;
  payslip_id: string;
  date: string;
  attendance_record_id: string | null;
  is_scheduled_working_day: boolean;
  actual_hours: number;
  display_label: string;
  day_pay: number;
  hourly_rate_applied: number | null;
  created_at: string;
};

export type DbPayslipLineItemRow = {
  id: string;
  payslip_id: string;
  item_type: LineItemType;
  label: string;
  amount: number;
  notes: string | null;
  added_by: string | null;
  created_at: string;
};

export function mapEmployeeCompensation(row: DbEmployeeCompensationRow): EmployeeCompensation {
  return {
    id: row.id,
    officerId: row.officer_id,
    monthlySalary: Number(row.monthly_salary),
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function mapPayTypeRule(row: DbPayTypeRuleRow): PayTypeRule {
  return {
    id: row.id,
    attendanceStatus: row.attendance_status,
    payFraction: Number(row.pay_fraction),
    usesScheduledHours: row.uses_scheduled_hours,
    description: row.description,
    updatedAt: row.updated_at,
  };
}

export function mapAttendanceLabelThreshold(row: DbAttendanceLabelThresholdRow): AttendanceLabelThreshold {
  return {
    id: row.id,
    label: row.label,
    minHoursFraction: Number(row.min_hours_fraction),
    maxHoursFraction: row.max_hours_fraction != null ? Number(row.max_hours_fraction) : null,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  };
}

export function mapCompanyHoliday(row: DbCompanyHolidayRow): CompanyHoliday {
  return {
    id: row.id,
    holidayDate: row.holiday_date,
    name: row.name,
    appliesToAll: row.applies_to_all,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function mapPayslipLineItem(row: DbPayslipLineItemRow): PayslipLineItem {
  return {
    id: row.id,
    payslipId: row.payslip_id,
    itemType: row.item_type,
    label: row.label,
    amount: Number(row.amount),
    notes: row.notes,
    addedBy: row.added_by,
    createdAt: row.created_at,
  };
}

export function mapPayslipDailyBreakdown(row: DbPayslipDailyBreakdownRow): PayslipDailyBreakdown {
  return {
    id: row.id,
    payslipId: row.payslip_id,
    date: row.date,
    attendanceRecordId: row.attendance_record_id,
    isScheduledWorkingDay: row.is_scheduled_working_day,
    actualHours: Number(row.actual_hours),
    displayLabel: row.display_label,
    dayPay: Number(row.day_pay),
    hourlyRateApplied: row.hourly_rate_applied != null ? Number(row.hourly_rate_applied) : null,
    createdAt: row.created_at,
  };
}

export function mapPayslip(row: DbPayslipRow): Payslip {
  return {
    id: row.id,
    officerId: row.officer_id,
    payPeriodStart: row.pay_period_start,
    payPeriodEnd: row.pay_period_end,
    payPeriodLabel: row.pay_period_label,
    companyName: row.company_name,
    companyAddress: row.company_address,
    companyLogoUrl: row.company_logo_url,
    employeeName: row.employee_name,
    employeeDesignation: row.employee_designation,
    employeeIdDisplay: row.employee_id_display,
    employeeDepartment: row.employee_department,
    bankAccountLast4: row.bank_account_last4,
    hourlyRate: Number(row.hourly_rate),
    totalScheduledDays: row.total_scheduled_days,
    totalWorkedDays: row.total_worked_days,
    totalActualHours: Number(row.total_actual_hours),
    grossEarnings: Number(row.gross_earnings),
    totalAdditions: Number(row.total_additions),
    totalDeductions: Number(row.total_deductions),
    netPay: Number(row.net_pay),
    status: row.status,
    generatedPdfUrl: row.generated_pdf_url,
    authorizedBy: row.authorized_by,
    authorizedSignatureName: row.authorized_signature_name,
    authorizedAt: row.authorized_at,
    generatedBy: row.generated_by,
    negativePayOverrideNote: row.negative_pay_override_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    officerName: row.officers?.full_name,
    dailyBreakdown: row.payslip_daily_breakdown?.map(mapPayslipDailyBreakdown),
    lineItems: row.payslip_line_items?.map(mapPayslipLineItem),
  };
}

export function displayLabelToColorKey(label: string): CalendarDayCell['colorKey'] {
  const lower = label.toLowerCase();
  if (lower.includes('holiday')) return 'holiday';
  if (lower.includes('weekly off')) return 'weekly_off';
  if (lower.includes('leave')) return 'leave';
  if (lower.includes('extra')) return 'extra';
  if (lower.includes('half')) return 'half_day';
  if (lower.includes('quarter')) return 'quarter_day';
  if (lower.includes('partial')) return 'partial';
  if (lower.includes('absent')) return 'absent';
  return 'present';
}

export function breakdownToCalendarCells(
  breakdown: PayslipDailyBreakdown[],
  year: number,
  month: number,
): CalendarDayCell[] {
  const monthStr = String(month).padStart(2, '0');
  const daysInMonth = new Date(year, month, 0).getDate();
  const byDate = new Map(breakdown.map((d) => [d.date, d]));

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
    const row = byDate.get(date);
    const displayLabel = row?.displayLabel ?? '';
    return {
      date,
      day,
      displayLabel,
      actualHours: row?.actualHours ?? 0,
      dayPay: row?.dayPay ?? 0,
      isScheduledWorkingDay: row?.isScheduledWorkingDay ?? false,
      colorKey: displayLabel ? displayLabelToColorKey(displayLabel) : 'weekly_off',
    };
  });
}
