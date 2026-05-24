export type Role = 'ADMIN' | 'OFFICER' | 'STAFF';
export type CaseStatus = 'REPORTED' | 'UNDER_REVIEW' | 'DECIDED' | 'CLOSED' | 'ESCALATED';
export type CaseSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type CaseOutcome = 'CLEARED' | 'WARNING' | 'SUSPENSION' | 'EXPULSION' | 'REFERRED';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  department: string;
  is_active?: boolean;
  last_login?: string;
  joined?: string;
  phone?: string;
}

export interface Student {
  id: number;
  reg_number: string;
  first_name: string;
  last_name: string;
  department: string;
  academic_year: string;
  level?: string;
  biometric_enrolled: boolean;
  is_active: boolean;
  case_count: number;
  created_at: string;
  gender?: string;
  phone?: string;
  email?: string;
}

export interface IncidentType {
  id: number;
  name: string;
  default_severity: CaseSeverity;
}

export interface DisciplinaryCase {
  id: number;
  case_number: string;
  student_id: number;
  incident_type: string;
  severity: CaseSeverity;
  status: CaseStatus;
  outcome?: CaseOutcome;
  date_of_incident: string;
  description: string;
  location?: string;
  reported_by: string;
  assigned_to?: string;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  user: string;
  action: string;
  description: string;
  resource_type: string;
  resource_id: string;
  ip_address: string;
  timestamp: string;
}
