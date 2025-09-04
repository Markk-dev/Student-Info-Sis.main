import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from './layout';
import { toast } from 'sonner';
import { authService } from '@/lib/services';
import { useAuth } from '@/contexts/AuthContext';

export function RegisterPage() {
  const { login } = useAuth();
  
  
  const generateStudentId = () => {
    const firstPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const secondPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${firstPart}-${secondPart}`;
  };

  const [formData, setFormData] = useState({
    studentId: generateStudentId(), 
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    course: '',
    yearLevel: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      
      const { settingsService } = await import('@/lib/services');
      const isMaintenance = await settingsService.isSystemInMaintenance();
      
      if (isMaintenance) {
        toast.error('System is currently under maintenance. Registration is temporarily disabled. Please try again later.');
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error checking maintenance status:', error);
      
    }

    
    if (!formData.studentId || !formData.email || !formData.password || !formData.confirmPassword || 
        !formData.firstName || !formData.lastName || !formData.course || !formData.yearLevel) {
      toast.error('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      
      const result = await authService.registerStudent({
        studentId: formData.studentId,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        course: formData.course,
        yearLevel: formData.yearLevel
      });

      
      const studentData = {
        studentId: formData.studentId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        course: formData.course,
        yearLevel: formData.yearLevel,
        isActive: true,
        balance: 0
      };
      
      await login('student', studentData);
      
      toast.success('Registration successful! Welcome to your dashboard.');
      
      
      window.location.href = '/student/dashboard';
      
    } catch (error: any) {
      console.error('Registration error:', error);
      
      
      if (error.code === 409) {
        toast.error('A user with this email already exists');
      } else if (error.code === 400) {
        toast.error('Invalid email format or password requirements not met');
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      activeTab="student"
      onTabChange={() => {}} 
      title="Student Registration"
      subtitle="Create your student account"
    >
      <form onSubmit={handleStudentRegister} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name</Label>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="Enter first name"
              value={formData.firstName}
              onChange={handleInputChange}
              className="h-11 px-4 border-gray-300 focus:border-green-500 focus:ring-green-500"
              required
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name</Label>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Enter last name"
              value={formData.lastName}
              onChange={handleInputChange}
              className="h-11 px-4 border-gray-300 focus:border-green-500 focus:ring-green-500"
              required
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="studentId" className="text-sm font-medium text-gray-700">
            Student ID <span className="text-xs text-gray-500">(Auto-generated)</span>
          </Label>
          <Input
            id="studentId"
            name="studentId"
            type="text"
            value={formData.studentId}
            readOnly
            className="h-11 px-4 border-gray-300 bg-gray-50 text-gray-700 cursor-not-allowed"
            required
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email address"
            value={formData.email}
            onChange={handleInputChange}
            className="h-11 px-4 border-gray-300 focus:border-green-500 focus:ring-green-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="course" className="text-sm font-medium text-gray-700">Course</Label>
            <Input
              id="course"
              name="course"
              type="text"
              placeholder="e.g., Computer Science"
              value={formData.course}
              onChange={handleInputChange}
              className="h-11 px-4 border-gray-300 focus:border-green-500 focus:ring-green-500"
              required
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="yearLevel" className="text-sm font-medium text-gray-700">Year Level</Label>
            <Input
              id="yearLevel"
              name="yearLevel"
              type="text"
              placeholder="e.g., 3rd Year"
              value={formData.yearLevel}
              onChange={handleInputChange}
              className="h-11 px-4 border-gray-300 focus:border-green-500 focus:ring-green-500"
              required
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter password"
            value={formData.password}
            onChange={handleInputChange}
            className="h-11 px-4 border-gray-300 focus:border-green-500 focus:ring-green-500"
            required
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className="h-11 px-4 border-gray-300 focus:border-green-500 focus:ring-green-500"
            required
          />
        </div>

        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-medium text-base rounded-lg transition-colors duration-200" 
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Register as Student'}
          </Button>
        </div>

        <div className="text-center pt-6">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/" className="text-green-600 hover:text-green-700 font-medium transition-colors duration-200">
              Login here
            </a>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
} 