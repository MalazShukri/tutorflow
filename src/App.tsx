import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Compass, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/auth";
import { QuickActionsProvider } from "@/components/QuickActions";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import LoginPage from "@/pages/Login";
import StudentsPage from "@/pages/Students";
import StudentProfilePage from "@/pages/StudentProfile";
import SubjectProgressPage from "@/pages/SubjectProgress";
import LessonsPage from "@/pages/Lessons";
import SettingsPage from "@/pages/Settings";

function ProtectedRoute() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" aria-label="جارٍ التحميل" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return (
    <QuickActionsProvider>
      <Outlet />
    </QuickActionsProvider>
  );
}

function NotFound() {
  return (
    <Card>
      <EmptyState
        icon={<Compass />}
        title="الصفحة غير موجودة"
        description="الرابط الذي فتحته غير صحيح."
        action={
          <Link to="/" className={buttonVariants({ variant: "secondary" })}>
            العودة إلى الرئيسية
          </Link>
        }
      />
    </Card>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<StudentsPage />} />
            <Route path="students" element={<Navigate to="/" replace />} />
            <Route path="students/:id" element={<StudentProfilePage />} />
            <Route path="progress/:id" element={<SubjectProgressPage />} />
            <Route path="lessons" element={<LessonsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
