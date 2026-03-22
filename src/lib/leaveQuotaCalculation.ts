import { supabase } from '@/integrations/supabase/client';
import type { EmployeeType, EmployeeStatus } from '@/types/hr';

interface PolicyRule {
  annual_leave_quota: number;
  sick_leave_quota: number;
  personal_leave_quota: number;
  other_leave_quota: number;
  is_prorated: boolean;
}

interface CalculatedQuotas {
  annual_leave_quota: number;
  sick_leave_quota: number;
  personal_leave_quota: number;
  other_leave_quota: number;
}

/**
 * Fetch leave policy based on employee type and status
 */
export async function fetchLeavePolicy(
  employeeType: EmployeeType,
  status: EmployeeStatus = 'active',
  yearsOfService: number = 0
): Promise<PolicyRule | null> {
  const { data } = await supabase
    .from('leave_policy_rules')
    .select('*')
    .eq('employee_type', employeeType)
    .eq('employee_status', status)
    .lte('min_years_of_service', yearsOfService)
    .or(`max_years_of_service.is.null,max_years_of_service.gte.${yearsOfService}`)
    .order('min_years_of_service', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

/**
 * Calculate prorated leave quota based on start date
 */
export function calculateProratedQuota(
  annualQuota: number,
  startDate: string,
  year: number,
  isProrated: boolean = true
): number {
  if (!isProrated || annualQuota === 0) {
    return annualQuota;
  }

  const startDateObj = new Date(startDate);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  // If start date is before year start, use year start
  const effectiveStart = startDateObj > yearStart ? startDateObj : yearStart;

  // If start date is after year end, no entitlement
  if (effectiveStart > yearEnd) {
    return 0;
  }

  // Calculate days worked (from effective start to year end)
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysWorked = Math.floor((yearEnd.getTime() - effectiveStart.getTime()) / msPerDay) + 1;
  const totalDaysInYear = 365;

  // Calculate prorated entitlement
  const prorated = (annualQuota / totalDaysInYear) * daysWorked;

  // Round down to nearest 0.5
  return Math.floor(prorated * 2) / 2;
}

/**
 * Calculate leave quotas based on employee type and start date
 */
export async function calculateLeaveQuotas(
  employeeType: EmployeeType,
  startDate: string,
  status: EmployeeStatus = 'active'
): Promise<CalculatedQuotas> {
  const currentYear = new Date().getFullYear();
  const startYear = new Date(startDate).getFullYear();
  const yearsOfService = currentYear - startYear;

  // Fetch policy
  const policy = await fetchLeavePolicy(employeeType, status, yearsOfService);

  if (!policy) {
    // Default values if no policy found
    return {
      annual_leave_quota: 6,
      sick_leave_quota: 30,
      personal_leave_quota: 6,
      other_leave_quota: 5,
    };
  }

  // Calculate prorated quotas
  return {
    annual_leave_quota: calculateProratedQuota(
      policy.annual_leave_quota,
      startDate,
      currentYear,
      policy.is_prorated
    ),
    sick_leave_quota: calculateProratedQuota(
      policy.sick_leave_quota,
      startDate,
      currentYear,
      policy.is_prorated
    ),
    personal_leave_quota: calculateProratedQuota(
      policy.personal_leave_quota,
      startDate,
      currentYear,
      policy.is_prorated
    ),
    other_leave_quota: calculateProratedQuota(
      policy.other_leave_quota,
      startDate,
      currentYear,
      policy.is_prorated
    ),
  };
}
