import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/lib/services';
import { DottedSeparator } from './ui/dotted-line';

export function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [adminId, setAdminId] = useState('');
  const { login } = useAuth();

  
  useEffect(() => {
    const savedAdminId = localStorage.getItem('remembered_admin_id');
    if (savedAdminId) {
      setAdminId(savedAdminId);
      setRememberMe(true);
    }
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const formAdminId = (e.target as HTMLFormElement).adminId?.value;
    const password = (e.target as HTMLFormElement).password?.value;

    if (!formAdminId || !password) {
      toast.error('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    
    if (rememberMe) {
      localStorage.setItem('remembered_admin_id', formAdminId);
    } else {
      localStorage.removeItem('remembered_admin_id');
    }

    try {
      const result = await authService.loginAdmin(formAdminId, password);
      
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-5">
          <div className="flex items-center justify-end">
            <img src="/logo/Logo.svg" alt="CanSys" className="h-9 w-9" />      
          </div>
          <div className="text-start">
            <h2 className="text-2xl mt-[-10px] font-bold text-gray-800"><span className='text-green-500'>Admin</span> Login</h2>
            <p className="text-xs mt-1 text-gray-600">Enter login-in details to access your account.</p>
          </div>

          <DottedSeparator className="py-3"/>    
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="adminId" className="text-sm font-medium text-gray-900">
                Administrator ID
              </Label>
              <Input
                id="adminId"
                name="adminId"
                type="text"
                placeholder="Enter your administrator ID"
                className="h-11"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-900">
                  Password
                </Label>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                className="h-11"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => {
                  setRememberMe(e.target.checked);
                  if (!e.target.checked) {
                    localStorage.removeItem('remembered_admin_id');
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
                  <Label htmlFor="rememberMe" className="text-xs text-gray-700 cursor-pointer">
                    Remember me
                  </Label>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-green-500 hover:bg-green-600 text-white font-medium" 
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

