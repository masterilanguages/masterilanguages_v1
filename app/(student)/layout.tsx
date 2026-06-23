import StudentLayout from "@/components/student/StudentLayout";
import Providers from "@/components/providers/Providers";

export default function StudentGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <StudentLayout>{children}</StudentLayout>
    </Providers>
  );
}
