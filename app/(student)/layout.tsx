import StudentLayout from "@/components/student/StudentLayout";
import Providers from "@/components/providers/Providers";

// El portal de estudiante es dinamico (auth + datos Supabase en vivo, paginas
// 'use client' que leen useSearchParams). No tiene sentido prerenderizarlo
// estatico — esto opta a todo el grupo (student) a render dinamico y evita el
// bailout de "useSearchParams sin Suspense" en el build.
export const dynamic = "force-dynamic";

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
