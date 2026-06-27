/**
 * Single source of truth for payslip math.
 * Keep in sync with supabase/functions/_shared/payslipCalculation.ts
 */
export class PayslipCalculationError extends Error {
  readonly code: string;
  readonly unresolvedDates?: string[];
  readonly missingFields?: string[];

  constructor(
    message: string,
    code: string,
    details?: { unresolvedDates?: string[]; missingFields?: string[] },
  ) {
    super(message);
    this.name = 'PayslipCalculationError';
    this.code = code;
    this.unresolvedDates = details?.unresolvedDates;
    this.missingFields = details?.missingFields;
  }
}

export type PayTypeRuleInput = {
  attendanceStatus: string;
  payFraction: number;
  usesScheduledHours: boolean;
};

export type LabelThresholdInput = {
  label: string;
  minHoursFraction: number;
  maxHoursFraction: number | null;
  sortOrder: number;
};

export type CompensationInput = {
  id: string;
  monthlySalary: number;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type ShiftDefinitionInput = {
  startTime: string;
  endTime: string;
  workingDays: number[];
  isOvernight: boolean;
};

export type ShiftRecordInput = {
  id: string;
  shiftDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  attendanceStatus: string | null;
  workingHours: number | null;
  status: string | null;
};

export type OfficerSnapshotInput = {
  officerId: string;
  fullName: string | null | undefined;
  employeeId: string | null | undefined;
  department: string | null | undefined;
  designation: string | null | undefined;
  bankAccountNumber: string | null | undefined;
};

export type OfficerSnapshot = {
  officerId: string;
  fullName: string;
  designation: string;
  department: string;
  employeeIdDisplay: string;
  bankAccountLast4: string;
};

export type DayResolution =
  | 'attendance'
  | 'holiday'
  | 'weekly_off'
  | 'unresolved'
  | 'incomplete';

export type PayslipCalculationDay = {
  date: string;
  attendanceRecordId: string | null;
  isScheduledWorkingDay: boolean;
  resolution: DayResolution;
  attendanceStatus: string | null;
  actualHours: number;
  scheduledHours: number;
  displayLabel: string;
  payRuleKey: string | null;
  payFraction: number;
  hoursCounted: number;
  hourlyRateApplied: number;
  dayPay: number;
};

export type PayslipResult = {
  officerSnapshot: OfficerSnapshot;
  period: { start: string; end: string; label: string };
  hourlyRate: number;
  workingDays: number;
  totalWorkedDays: number;
  totalActualHours: number;
  dailyBreakdown: PayslipCalculationDay[];
  grossPay: number;
  additions: number;
  deductions: number;
  netPay: number;
  generatedAt: string;
  warnings: string[];
  blockingDates: string[];
  blocked: boolean;
  rateChangeDates: string[];
};

export type CalculatePayslipCoreInput = {
  officer: OfficerSnapshotInput;
  payPeriodStart: string;
  payPeriodEnd: string;
  payPeriodLabel: string;
  compensations: CompensationInput[];
  shiftDefinition: ShiftDefinitionInput;
  hasShiftAssignment: boolean;
  shifts: ShiftRecordInput[];
  holidays: string[];
  payRules: PayTypeRuleInput[];
  labelThresholds: LabelThresholdInput[];
  preservedAdditions?: number;
  preservedDeductions?: number;
  generatedAt?: string;
};

const LABEL_TO_PAY_RULE: Record<string, string> = {
  Present: 'present',
  'Present (Extra Hours)': 'present',
  'Half Day': 'half_day',
  'Quarter Day': 'half_day',
  Partial: 'half_day',
  Absent: 'absent',
  Holiday: 'holiday',
  Leave: 'on_leave',
};

export function parseTimeToHours(time: string): number {
  const parts = time.split(':');
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  const s = Number(parts[2]?.split('.')[0] ?? 0);
  return h + m / 60 + s / 3600;
}

/** shift_hours_per_day = end_time - start_time (handles overnight) */
export function shiftHoursPerDay(def: ShiftDefinitionInput): number {
  const start = parseTimeToHours(def.startTime);
  const end = parseTimeToHours(def.endTime);
  if (def.isOvernight || end <= start) {
    return 24 - start + end;
  }
  return end - start;
}

/**
 * hourly_rate = monthly_salary / monthly_hours_average
 * monthly_hours_average = (shift_hours_per_day * working_days_per_week * 52) / 12
 */
export function computeHourlyRate(monthlySalary: number, def: ShiftDefinitionInput): number {
  const hoursPerDay = shiftHoursPerDay(def);
  const workingDaysPerWeek = def.workingDays.length;
  const annualHours = hoursPerDay * workingDaysPerWeek * 52;
  const monthlyHoursAverage = annualHours / 12;
  if (monthlyHoursAverage <= 0) return 0;
  return Math.round((monthlySalary / monthlyHoursAverage) * 100) / 100;
}

export function eachDateInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function dayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

function hoursBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.round((ms / 3600000) * 100) / 100;
}

function compensationForDate(rows: CompensationInput[], date: string): CompensationInput {
  const matches = rows.filter((r) => {
    return date >= r.effectiveFrom && (r.effectiveTo == null || date <= r.effectiveTo);
  });
  if (matches.length === 0) {
    throw new PayslipCalculationError(
      `No salary record covers ${date}`,
      'MISSING_COMPENSATION_FOR_DATE',
    );
  }
  if (matches.length > 1) {
    throw new PayslipCalculationError(
      `Ambiguous salary records for ${date} — close overlapping effective ranges`,
      'AMBIGUOUS_COMPENSATION',
    );
  }
  return matches[0]!;
}

function resolveDisplayLabel(
  actualHours: number,
  shiftHours: number,
  attendanceStatus: string | null,
  thresholds: LabelThresholdInput[],
  isHoliday: boolean,
  isWeeklyOff: boolean,
): string {
  if (isHoliday) return 'Holiday';
  if (isWeeklyOff) return 'Weekly Off';
  if (attendanceStatus === 'on_leave') return 'Leave';
  if (attendanceStatus === 'holiday') return 'Holiday';

  if (actualHours <= 0 && (!attendanceStatus || attendanceStatus === 'absent')) {
    return 'Absent';
  }

  const fraction = shiftHours > 0 ? actualHours / shiftHours : 0;
  const sorted = [...thresholds].sort((a, b) => b.sortOrder - a.sortOrder);
  for (const t of sorted) {
    const min = t.minHoursFraction;
    const max = t.maxHoursFraction;
    if (fraction >= min && (max == null || fraction <= max)) {
      return t.label;
    }
  }
  return actualHours > 0 ? 'Present' : 'Absent';
}

function payRuleKeyForDay(
  displayLabel: string,
  attendanceStatus: string | null,
): string | null {
  if (displayLabel === 'Weekly Off') return null;
  if (attendanceStatus === 'on_leave') return 'on_leave';
  if (attendanceStatus === 'holiday') return 'holiday';
  if (attendanceStatus === 'half_day') return 'half_day';
  if (attendanceStatus === 'late') return 'late';
  if (attendanceStatus === 'absent') return 'absent';
  if (attendanceStatus === 'present') return 'present';
  return LABEL_TO_PAY_RULE[displayLabel] ?? null;
}

function computeDayPay(
  rule: PayTypeRuleInput | undefined,
  hourlyRate: number,
  shiftHours: number,
  actualHours: number,
  payRuleKey: string | null,
): { dayPay: number; payFraction: number; hoursCounted: number } {
  if (!payRuleKey || payRuleKey === 'weekly_off') {
    return { dayPay: 0, payFraction: 0, hoursCounted: 0 };
  }

  if (!rule) {
    throw new PayslipCalculationError(
      `No pay rule configured for status "${payRuleKey}"`,
      'MISSING_PAY_RULE',
    );
  }

  const payFraction = rule.payFraction;
  if (payFraction <= 0) {
    return { dayPay: 0, payFraction, hoursCounted: 0 };
  }

  const hoursCounted = rule.usesScheduledHours ? shiftHours : actualHours;
  const dayPay =
    Math.round(hourlyRate * hoursCounted * payFraction * 100) / 100;

  return { dayPay, payFraction, hoursCounted };
}

export type AttendancePeriodSummary = {
  workingDays: number;
  present: number;
  absent: number;
  leave: number;
  holiday: number;
  weeklyOff: number;
  unresolved: number;
  incomplete: number;
  unresolvedDates: string[];
  incompleteDates: string[];
  canGenerate: boolean;
  noShiftAssigned: boolean;
  warnings: string[];
};

export function summarizePayPeriodAttendance(input: {
  payPeriodStart: string;
  payPeriodEnd: string;
  shiftDefinition: ShiftDefinitionInput;
  hasShiftAssignment: boolean;
  shifts: ShiftRecordInput[];
  holidays: string[];
}): AttendancePeriodSummary {
  if (!input.hasShiftAssignment) {
    return {
      workingDays: 0,
      present: 0,
      absent: 0,
      leave: 0,
      holiday: 0,
      weeklyOff: 0,
      unresolved: 0,
      incomplete: 0,
      unresolvedDates: [],
      incompleteDates: [],
      canGenerate: false,
      noShiftAssigned: true,
      warnings: ['Officer has no shift schedule assigned'],
    };
  }

  const holidayDates = new Set(input.holidays);
  const shiftByDate = new Map(input.shifts.map((s) => [s.shiftDate, s]));
  const unresolvedDates: string[] = [];
  const incompleteDates: string[] = [];
  const warnings: string[] = [];

  let workingDays = 0;
  let present = 0;
  let absent = 0;
  let leave = 0;
  let holiday = 0;
  let weeklyOff = 0;
  let unresolved = 0;
  let incomplete = 0;

  for (const date of eachDateInRange(input.payPeriodStart, input.payPeriodEnd)) {
    const dow = dayOfWeek(date);
    const isScheduled = input.shiftDefinition.workingDays.includes(dow);
    const isHoliday = holidayDates.has(date);
    const isWeeklyOff = !isScheduled && !isHoliday;
    const shift = shiftByDate.get(date);

    if (isScheduled) workingDays += 1;

    if (shift) {
      if (shift.checkInTime && !shift.checkOutTime && shift.status === 'active') {
        incomplete += 1;
        incompleteDates.push(date);
        continue;
      }

      const status = shift.attendanceStatus;
      if (status === 'on_leave') leave += 1;
      else if (status === 'holiday' || isHoliday) holiday += 1;
      else if (status === 'absent') absent += 1;
      else present += 1;
      continue;
    }

    if (isHoliday) {
      holiday += 1;
    } else if (isWeeklyOff) {
      weeklyOff += 1;
    } else if (isScheduled) {
      unresolved += 1;
      unresolvedDates.push(date);
    } else {
      weeklyOff += 1;
    }
  }

  if (unresolved > 0) {
    warnings.push(`${unresolved} scheduled day(s) have no attendance record`);
  }
  if (incomplete > 0) {
    warnings.push(`${incomplete} day(s) have check-in without check-out`);
  }

  return {
    workingDays,
    present,
    absent,
    leave,
    holiday,
    weeklyOff,
    unresolved,
    incomplete,
    unresolvedDates,
    incompleteDates,
    canGenerate: unresolved === 0 && incomplete === 0,
    noShiftAssigned: false,
    warnings,
  };
}

export function validateOfficerSnapshot(officer: OfficerSnapshotInput): OfficerSnapshot {
  const missing: string[] = [];
  if (!officer.fullName?.trim()) missing.push('full_name');
  if (!officer.designation?.trim()) missing.push('designation');
  if (!officer.department?.trim()) missing.push('department');
  if (!officer.bankAccountNumber?.trim()) missing.push('bank_account');

  if (missing.length > 0) {
    throw new PayslipCalculationError(
      `Missing required officer fields: ${missing.join(', ')}`,
      'MISSING_OFFICER_DATA',
      { missingFields: missing },
    );
  }

  const account = officer.bankAccountNumber!.trim();
  const last4 = account.length >= 4 ? account.slice(-4) : account;

  return {
    officerId: officer.officerId,
    fullName: officer.fullName!.trim(),
    designation: officer.designation!.trim(),
    department: officer.department!.trim(),
    employeeIdDisplay:
      officer.employeeId?.trim() || officer.officerId.slice(0, 8).toUpperCase(),
    bankAccountLast4: last4,
  };
}

export function calculatePayslipCore(input: CalculatePayslipCoreInput): PayslipResult {
  if (!input.compensations.length) {
    throw new PayslipCalculationError(
      'No employee compensation configured for this officer',
      'MISSING_COMPENSATION',
    );
  }

  if (!input.hasShiftAssignment) {
    throw new PayslipCalculationError(
      'Officer has no shift schedule assigned — assign a shift before generating payslips',
      'NO_SHIFT_ASSIGNED',
    );
  }

  const officerSnapshot = validateOfficerSnapshot(input.officer);
  const shiftHours = shiftHoursPerDay(input.shiftDefinition);
  const holidayDates = new Set(input.holidays);
  const shiftByDate = new Map(input.shifts.map((s) => [s.shiftDate, s]));
  const rulesByStatus = new Map(
    input.payRules.map((r) => [r.attendanceStatus, r]),
  );

  for (const date of eachDateInRange(input.payPeriodStart, input.payPeriodEnd)) {
    compensationForDate(input.compensations, date);
  }

  const rateChangeDates: string[] = [];
  let prevCompKey: string | null = null;
  for (const date of eachDateInRange(input.payPeriodStart, input.payPeriodEnd)) {
    const comp = compensationForDate(input.compensations, date);
    const key = `${comp.id}-${comp.monthlySalary}`;
    if (prevCompKey && prevCompKey !== key) rateChangeDates.push(date);
    prevCompKey = key;
  }

  const blockingDates: string[] = [];
  const unresolvedDates: string[] = [];
  const warnings: string[] = [];
  const dailyBreakdown: PayslipCalculationDay[] = [];

  let workingDays = 0;
  let totalWorkedDays = 0;
  let totalActualHours = 0;
  let grossPay = 0;
  let primaryHourlyRate = 0;

  for (const date of eachDateInRange(input.payPeriodStart, input.payPeriodEnd)) {
    const dow = dayOfWeek(date);
    const isScheduled = input.shiftDefinition.workingDays.includes(dow);
    const isHoliday = holidayDates.has(date);
    const isWeeklyOff = !isScheduled && !isHoliday;
    const shift = shiftByDate.get(date);

    const comp = compensationForDate(input.compensations, date);
    const monthlySalary = comp.monthlySalary;
    const hourlyRate = computeHourlyRate(monthlySalary, input.shiftDefinition);
    if (primaryHourlyRate === 0 && hourlyRate > 0) primaryHourlyRate = hourlyRate;

    let actualHours = 0;
    let attendanceStatus = shift?.attendanceStatus ?? null;

    if (shift?.workingHours != null) {
      actualHours = shift.workingHours;
    } else if (shift?.checkInTime && shift?.checkOutTime) {
      actualHours = hoursBetween(shift.checkInTime, shift.checkOutTime);
    }

    let resolution: DayResolution;
    if (shift) {
      if (shift.checkInTime && !shift.checkOutTime && shift.status === 'active') {
        resolution = 'incomplete';
        blockingDates.push(date);
      } else {
        resolution = 'attendance';
      }
    } else if (isHoliday) {
      resolution = 'holiday';
    } else if (isWeeklyOff) {
      resolution = 'weekly_off';
    } else if (isScheduled) {
      resolution = 'unresolved';
      unresolvedDates.push(date);
    } else {
      resolution = 'weekly_off';
    }

    if (isScheduled) workingDays += 1;
    if (actualHours > 0) {
      totalWorkedDays += 1;
      totalActualHours += actualHours;
    }

    const displayLabel = resolveDisplayLabel(
      actualHours,
      shiftHours,
      attendanceStatus,
      input.labelThresholds,
      isHoliday,
      isWeeklyOff && !shift,
    );

    const payRuleKey = payRuleKeyForDay(displayLabel, attendanceStatus);
    let dayPay = 0;
    let payFraction = 0;
    let hoursCounted = 0;

    if (resolution !== 'unresolved' && resolution !== 'incomplete') {
      const rule = payRuleKey ? rulesByStatus.get(payRuleKey) : undefined;
      const computed = computeDayPay(rule, hourlyRate, shiftHours, actualHours, payRuleKey);
      dayPay = computed.dayPay;
      payFraction = computed.payFraction;
      hoursCounted = computed.hoursCounted;
      grossPay += dayPay;
    }

    dailyBreakdown.push({
      date,
      attendanceRecordId: shift?.id ?? null,
      isScheduledWorkingDay: isScheduled,
      resolution,
      attendanceStatus,
      actualHours,
      scheduledHours: shiftHours,
      displayLabel,
      payRuleKey,
      payFraction,
      hoursCounted,
      hourlyRateApplied: hourlyRate,
      dayPay,
    });
  }

  if (unresolvedDates.length > 0) {
    throw new PayslipCalculationError(
      `Incomplete attendance on ${unresolvedDates.length} day(s): ${unresolvedDates.join(', ')}`,
      'UNRESOLVED_DAYS',
      { unresolvedDates },
    );
  }

  if (blockingDates.length > 0) {
    return {
      officerSnapshot,
      period: {
        start: input.payPeriodStart,
        end: input.payPeriodEnd,
        label: input.payPeriodLabel,
      },
      hourlyRate: primaryHourlyRate,
      workingDays,
      totalWorkedDays,
      totalActualHours: Math.round(totalActualHours * 100) / 100,
      dailyBreakdown,
      grossPay: Math.round(grossPay * 100) / 100,
      additions: input.preservedAdditions ?? 0,
      deductions: input.preservedDeductions ?? 0,
      netPay:
        Math.round(
          (grossPay + (input.preservedAdditions ?? 0) - (input.preservedDeductions ?? 0)) * 100,
        ) / 100,
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      warnings,
      blockingDates,
      blocked: true,
      rateChangeDates,
    };
  }

  if (primaryHourlyRate <= 0) {
    warnings.push('Hourly rate computed as zero — check salary and shift configuration');
  }

  const additions = input.preservedAdditions ?? 0;
  const deductions = input.preservedDeductions ?? 0;
  const netPay = Math.round((grossPay + additions - deductions) * 100) / 100;

  return {
    officerSnapshot,
    period: {
      start: input.payPeriodStart,
      end: input.payPeriodEnd,
      label: input.payPeriodLabel,
    },
    hourlyRate: primaryHourlyRate,
    workingDays,
    totalWorkedDays,
    totalActualHours: Math.round(totalActualHours * 100) / 100,
    dailyBreakdown,
    grossPay: Math.round(grossPay * 100) / 100,
    additions,
    deductions,
    netPay,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    warnings,
    blockingDates: [],
    blocked: false,
    rateChangeDates,
  };
}

/** Approval gate — uses persisted payslip totals, not a separate re-check. */
export function canApprovePayslip(
  netPay: number,
  overrideNote?: string,
): { allowed: boolean; reason?: string; requiresOverride: boolean } {
  if (netPay < 0) {
    if (!overrideNote?.trim()) {
      return {
        allowed: false,
        requiresOverride: true,
        reason: 'Net pay is negative — provide an override note to approve',
      };
    }
    return { allowed: true, requiresOverride: true };
  }

  if (netPay === 0) {
    if (!overrideNote?.trim()) {
      return {
        allowed: false,
        requiresOverride: true,
        reason: 'Net pay is zero — provide an override note explaining why this payslip should be approved',
      };
    }
    return { allowed: true, requiresOverride: true };
  }

  return { allowed: true, requiresOverride: false };
}

/** Extract comparable render payload for Review screen vs PDF parity checks. */
export function payslipRenderSnapshot(payslip: {
  employeeName: string;
  employeeDesignation: string;
  employeeDepartment: string | null;
  hourlyRate: number;
  grossEarnings: number;
  netPay: number;
  totalActualHours: number;
  dailyBreakdown?: Array<{
    date: string;
    displayLabel: string;
    actualHours: number;
    dayPay: number;
  }>;
}): string {
  const breakdown = (payslip.dailyBreakdown ?? [])
    .map((d) => `${d.date}|${d.displayLabel}|${d.actualHours}|${d.dayPay}`)
    .sort()
    .join('\n');

  return JSON.stringify({
    employeeName: payslip.employeeName,
    employeeDesignation: payslip.employeeDesignation,
    employeeDepartment: payslip.employeeDepartment,
    hourlyRate: payslip.hourlyRate,
    grossEarnings: payslip.grossEarnings,
    netPay: payslip.netPay,
    totalActualHours: payslip.totalActualHours,
    breakdown,
  });
}
