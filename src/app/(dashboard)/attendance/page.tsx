import AttendanceWorkspace from "@/features/attendance/components/AttendanceWorkspace";

export const metadata = {
  title: "Attendance | Unisex Parlour ERP",
  description: "Review branch attendance, punch evidence, and reconciliation history.",
};

export default function AttendancePage() {
  return <AttendanceWorkspace />;
}
