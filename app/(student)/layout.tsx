import StudentLayout from "@/components/student/StudentLayout";

export default function StudentGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudentLayout>{children}</StudentLayout>;
}
