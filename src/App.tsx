import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { StudentDashboard } from './components/student/StudentDashboard';
import { useAuth } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import type { Admin, Student } from '@/lib/appwrite';

function AppContent() {
  const { user, loading, logout } = useAuth();
  
  // Simple routing based on URL path
  const isRegisterPage = window.location.pathname === '/register';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {isRegisterPage ? <RegisterPage /> : <LoginPage />}
        <Toaster position="top-right" />
      </>
    );
  }

  if (user.type === 'admin') {
    return (
      <>
        <AdminLayout adminData={user.data as Admin} />
        <Toaster position="top-right" />
      </>
    );
  }

  if (user.type === 'student') {
    const studentData = user.data as Student;
    // Convert Appwrite Student to StudentDashboard expected format
    const dashboardStudentData = {
      id: studentData.studentId,
      name: `${studentData.firstName} ${studentData.lastName}`,
      course: studentData.course,
      yearLevel: studentData.yearLevel
    };

    return (
      <div className="min-h-screen bg-background">
        {/* Student Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary rounded-lg w-10 h-10 flex items-center justify-center">
                  <span className="text-primary-foreground font-semibold">UC</span>
                </div>
                <div>
                  <h1 className="font-semibold">University Canteen</h1>
                  <p className="text-sm text-muted-foreground">Student Portal</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Student Content */}
        <main className="container mx-auto px-4 py-6">
          <StudentDashboard studentData={dashboardStudentData} />
        </main>
        
        <Toaster position="top-right" />
      </div>
    );
  }

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
} 