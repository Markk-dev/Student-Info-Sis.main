import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { StudentDashboard } from './components/student/StudentDashboard';
import { useAuth } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, ChevronDown, Key } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import type { Admin, Student } from '@/lib/appwrite';

function AppContent() {
  const { user, loading, logout } = useAuth();
  
  // Simple routing based on URL path
  const isRegisterPage = window.location.pathname === '/register';

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogout = () => {
    try {
      // Clear any stored authentication data
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      
      // Show logout message
      toast.success('Logged out successfully');
      
      // Call the logout function from AuthContext
      logout();
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error during logout');
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (user?.type !== 'student') {
      toast.error('Password change is only available for students');
      return;
    }
    
    try {
      // Update password in database using student service
      const { studentService } = await import('@/lib/services');
      
      // For now, we'll use a simple approach - in a real app, you'd hash the password
      const studentData = user.data as Student;
      await studentService.updateStudent(studentData.studentId, {
        password: newPassword // In production, this should be hashed
      });
      
      toast.success('Password changed successfully');
      setShowChangePassword(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    }
  };

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
      id: studentData.$id || '', // Document ID for fetching student data
      studentId: studentData.studentId, // Student ID for fetching transactions
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
              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
                    <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Logout</span>
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowChangePassword(true)} className="flex items-center gap-2 text-xs sm:text-sm">
                    <Key className="h-4 w-4" />
                    Change Password
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-red-600 text-xs sm:text-sm">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Student Content */}
        <main className="container mx-auto px-4 py-6">
          <StudentDashboard studentData={dashboardStudentData} />
        </main>
        
        <Toaster position="top-right" />
        
        {/* Change Password Modal */}
        <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Change Password
              </DialogTitle>
              <DialogDescription>
                Enter your current password and choose a new password
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="oldPassword">Current Password</Label>
                <Input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowChangePassword(false);
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleChangePassword}>
                  Change Password
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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