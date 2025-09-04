import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from './layout';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/lib/services';

export function LoginPage() {
  const [activeTab, setActiveTab] = useState<'admin' | 'student'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      
      const { settingsService } = await import('@/lib/services');
      const isMaintenance = await settingsService.isSystemInMaintenance();
      
      if (isMaintenance) {
        toast.error('System is currently under maintenance. Please try again later.');
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error checking maintenance status:', error);
      
    }

    const studentId = (e.target as HTMLFormElement).studentId?.value;
    const password = (e.target as HTMLFormElement).password?.value;

    if (!studentId || !password) {
      toast.error('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      
      const result = await authService.loginStudent(studentId, password);
      
      
      await login('student', result.student);
      toast.success('Student login successful!');
    } catch (error: any) {
      console.error('Student login error:', error);
      
      if (error.code === 401) {
        toast.error('Invalid student ID or password');
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const adminId = (e.target as HTMLFormElement).adminId?.value;
    const password = (e.target as HTMLFormElement).password?.value;

    if (!adminId || !password) {
      toast.error('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      
      const result = await authService.loginAdmin(adminId, password);
      
      
      await login('admin', result.admin);
      toast.success('Admin login successful!');
    } catch (error: any) {
      console.error('Admin login error:', error);
      
      if (error.code === 401) {
        toast.error('Invalid administrator ID or password');
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title={activeTab === 'admin' ? 'Admin Login' : 'Student Login'}
      subtitle={activeTab === 'admin' ? 'Access administrator panel' : 'Access your student portal'}
    >
      {activeTab === 'admin' ? (
        
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminId">Administrator ID</Label>
            <Input
              id="adminId"
              name="adminId"
              type="text"
              placeholder="Enter administrator ID"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter password"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-green-500 hover:bg-green-600" 
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login as Administrator'}
          </Button>
        </form>
      ) : (
        
        <form onSubmit={handleStudentLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studentId">Student ID</Label>
            <Input
              id="studentId"
              name="studentId"
              type="text"
              placeholder="Enter student ID"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter password"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-green-500 hover:bg-green-600" 
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login as Student'}
          </Button>

          {/* <div className="text-center pt-4">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="/register" className="text-green-600 hover:text-green-700 font-medium">
                Register here
              </a>
            </p>
          </div> */}
        </form>
      )}
    </AuthLayout>
  );
}