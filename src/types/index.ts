export type Role = "ADMIN" | "OFFICER" | "STAFF";
export type CaseStatus = "REPORTED" | "UNDER_REVIEW" | "DECIDED" | "CLOSED";
export type CaseSeverity = "LOW" | "MEDIUM" | "HIGH";
export type CaseOutcome =
  | "CLEARED"
  | "WARNING"
  | "SUSPENSION"
  | "EXPULSION"
  | "REFERRED";

export interface Department {
  id: number;
  name: string;
  code: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  department: string | null;
  phone: string | null;
  is_active: boolean;
}

export interface StudentListItem {
  id: string;
  reg_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  department_name: string;
  academic_year: string;
  biometric_enrolled: boolean;
  is_active: boolean;
  case_count: number;
}

export interface Student extends StudentListItem {
  date_of_birth: string | null;
  gender: string;
  department: Department;
  level: string;
  phone: string;
  email: string;
  photo: string | null;
  registered_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentType {
  id: number;
  name: string;
  severity_default: CaseSeverity;
  is_active: boolean;
}

export interface StudentRef {
  id: string;
  reg_number: string;
  full_name: string;
  department_name: string;
}

export interface CaseListItem {
  id: string;
  case_number: string;
  student: StudentRef;
  incident_type_name: string;
  severity: CaseSeverity;
  status: CaseStatus;
  outcome: CaseOutcome | null;
  date_of_incident: string;
  location: string;
  created_at: string;
}

export interface CaseNote {
  id: number;
  body: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

export interface CaseDocument {
  id: number;
  file: string;
  original_filename: string;
  description: string;
  uploaded_by: number;
  uploaded_by_name: string;
  uploaded_at: string;
}

export interface DisciplinaryCase extends CaseListItem {
  incident_type: IncidentType;
  description: string;
  outcome_notes: string;
  reported_by: string;
  assigned_to: string | null;
  decided_by: string | null;
  decided_at: string | null;
  notes: CaseNote[];
  documents: CaseDocument[];
  updated_at: string;
}

export interface AuditEntry {
  id: number;
  user: number;
  user_name: string;
  action: string;
  resource_type: string;
  resource_id: string;
  description: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  ip_address: string;
  user_agent: string;
  timestamp: string;
}

export interface DashboardStats {
  headline: {
    total_students: number;
    open_cases: number;
    critical_cases: number;
    resolved_this_month: number;
    new_this_week: number;
  };
  status_breakdown: { status: string; count: number }[];
  monthly_trend: { month: string; year: number; count: number }[];
  top_departments: { name: string; case_count: number }[];
  repeat_offenders_count: number;
}
