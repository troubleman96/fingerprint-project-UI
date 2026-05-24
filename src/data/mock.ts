import type { Student, DisciplinaryCase, User, AuditEntry, IncidentType } from "@/types";

// Central demo dataset for the whole product. Most routes read directly from these
// arrays today, so changing values here immediately changes the visible app state.
export const departments = [
  "Computer Studies",
  "Business Administration",
  "Civil Engineering",
  "Electrical Engineering",
  "Hospitality & Tourism",
];

export const users: User[] = [
  { id: 1, email: "admin@email.com", full_name: "Amina Rashidi", role: "ADMIN", department: "IT Department", is_active: true, last_login: "2024-05-20T09:12:00Z", joined: "2022-01-10", phone: "+255 712 000 001" },
  { id: 2, email: "officer@email.com", full_name: "Khalfan Mwarami", role: "OFFICER", department: "Student Affairs", is_active: true, last_login: "2024-05-22T14:45:00Z", joined: "2022-03-15", phone: "+255 712 000 002" },
  { id: 3, email: "staff@email.com", full_name: "Zawadi Ally", role: "STAFF", department: "Registrar", is_active: true, last_login: "2024-05-23T08:01:00Z", joined: "2023-08-01", phone: "+255 712 000 003" },
  { id: 4, email: "j.mhina@email.com", full_name: "Juma Mhina", role: "OFFICER", department: "Student Affairs", is_active: true, last_login: "2024-05-21T11:00:00Z", joined: "2023-02-12" },
  { id: 5, email: "r.kessy@email.com", full_name: "Rehema Kessy", role: "STAFF", department: "Registrar", is_active: false, last_login: "2024-04-02T10:00:00Z", joined: "2022-11-09" },
];

export const incidentTypes: IncidentType[] = [
  { id: 1, name: "Academic Fraud", default_severity: "HIGH" },
  { id: 2, name: "Exam Misconduct", default_severity: "HIGH" },
  { id: 3, name: "Physical Misconduct", default_severity: "HIGH" },
  { id: 4, name: "Property Damage", default_severity: "MEDIUM" },
  { id: 5, name: "Unauthorized Access", default_severity: "MEDIUM" },
  { id: 6, name: "Attendance Violation", default_severity: "LOW" },
];

const fnames = ["Asha", "Baraka", "Chausiku", "Daudi", "Eliya", "Fatuma", "Gemma", "Hamisi", "Imani", "Juma", "Kito", "Lulu"];
const lnames = ["Mwakajinga", "Nkomo", "Ochieng", "Patel", "Qassim", "Rashid", "Sanga", "Tarimo", "Ulimwengu", "Vumi", "Wanjala", "Yusuf"];

// Seed a compact student dataset with enough variation to exercise list filters,
// detail pages, biometric status badges, and repeat-offender reporting.
export const students: Student[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  reg_number: `2202${String(29358370 + i).padStart(8, "0")}`,
  first_name: fnames[i],
  last_name: lnames[i],
  department: departments[i % departments.length],
  academic_year: i % 3 === 0 ? "2023/2024" : "2024/2025",
  level: `NTA Level ${5 + (i % 3)}`,
  biometric_enrolled: i % 3 !== 0,
  is_active: i !== 7,
  case_count: [0, 1, 0, 3, 2, 0, 1, 4, 0, 2, 1, 0][i],
  created_at: `2024-0${(i % 9) + 1}-${10 + (i % 18)}`,
  gender: i % 2 === 0 ? "Female" : "Male",
  phone: `+255 75${i} 000 ${100 + i}`,
  email: `${fnames[i].toLowerCase()}.${lnames[i].toLowerCase()}@email.com`,
}));

const statuses: any[] = ["REPORTED", "UNDER_REVIEW", "DECIDED", "CLOSED"];
const severities: any[] = ["LOW", "MEDIUM", "HIGH"];
const outcomes: any[] = ["WARNING", "SUSPENSION", "EXPULSION", "CLEARED", "REFERRED"];

// Cases are generated from students and incident types so dashboard, reports, and
// detail routes all stay internally consistent without hand-maintaining each record.
export const cases: DisciplinaryCase[] = Array.from({ length: 15 }, (_, i) => {
  const status = statuses[i % statuses.length];
  return {
    id: i + 1,
    case_number: `DIT-2024-${String(440 + i).padStart(4, "0")}`,
    student_id: (i % students.length) + 1,
    incident_type: incidentTypes[i % incidentTypes.length].name,
    severity: severities[i % 3],
    status,
    outcome: status === "DECIDED" || status === "CLOSED" ? outcomes[i % outcomes.length] : undefined,
    date_of_incident: `2024-05-${String((i % 27) + 1).padStart(2, "0")}`,
    description: `Incident reported involving the student. Investigation underway with witnesses and supporting documentation collected by the disciplinary office. Further details have been recorded.`,
    location: `Block ${String.fromCharCode(65 + (i % 5))}, Room ${100 + i * 7}`,
    reported_by: users[(i % 3) + 1].full_name,
    assigned_to: i % 4 === 3 ? undefined : users[(i % 2) + 1].full_name,
    created_at: `2024-05-${String((i % 27) + 1).padStart(2, "0")}T10:00:00Z`,
  };
});

export const auditLog: AuditEntry[] = Array.from({ length: 20 }, (_, i) => {
  const actions = ["LOGIN", "CASE_CREATE", "CASE_STATUS_CHANGE", "STUDENT_CREATE", "BIOMETRIC_ENROLL", "REPORT_EXPORT", "USER_CREATE"];
  const action = actions[i % actions.length];
  return {
    id: i + 1,
    user: users[i % users.length].full_name,
    action,
    description: `${action.replace("_", " ").toLowerCase()} performed on resource`,
    resource_type: action.startsWith("CASE") ? "DisciplinaryCase" : action.startsWith("STUDENT") ? "Student" : action.startsWith("USER") ? "User" : "System",
    resource_id: `DIT-2024-${String(440 + i).padStart(4, "0")}`,
    ip_address: `192.168.1.${10 + i}`,
    timestamp: `2024-05-${String(20 - (i % 20)).padStart(2, "0")}T${String(8 + (i % 12)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}:00Z`,
  };
});

export const dashboardStats = {
  total_students: 4821,
  open_cases: 38,
  critical_cases: 5,
  resolved_this_month: 61,
  new_this_week: 7,
  monthly_trend: [
    { month: "Nov", count: 12 },
    { month: "Dec", count: 9 },
    { month: "Jan", count: 14 },
    { month: "Feb", count: 18 },
    { month: "Mar", count: 22 },
    { month: "Apr", count: 28 },
    { month: "May", count: 38 },
  ],
  status_breakdown: [
    { status: "REPORTED", count: 14 },
    { status: "UNDER_REVIEW", count: 9 },
    { status: "DECIDED", count: 6 },
    { status: "CLOSED", count: 47 },
  ],
  top_departments: departments.map((name, i) => ({ name, case_count: [18, 14, 11, 8, 6][i] })),
  repeat_offenders_count: 9,
};
