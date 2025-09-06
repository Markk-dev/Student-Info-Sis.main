import React from 'react';
import { Shield, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'admin' | 'student';
  onTabChange: (tab: 'admin' | 'student') => void;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, activeTab, onTabChange, title, subtitle }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-green-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Canteen Management</h1>
          <p className="text-gray-600">Management System</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg p-1 mb-6 shadow-sm">
          <div className="flex">
            <button
              onClick={() => onTabChange('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'admin'
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Shield className="h-4 w-4" />
              Admin
            </button>
            <button
              onClick={() => onTabChange('student')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'student'
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <User className="h-4 w-4" />
              Student
            </button>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
            <p className="text-gray-600">{subtitle}</p>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  );
} 