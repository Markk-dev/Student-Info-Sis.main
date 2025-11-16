import React from 'react';
import { Shield, User } from 'lucide-react';
import { DottedSeparator } from './ui/dotted-line';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'admin' | 'student';
  onTabChange: (tab: 'admin' | 'student') => void;
  title: string;
  subtitle: string;
  showTabs?: boolean;
}

export function AuthLayout({ children, activeTab, onTabChange, title, subtitle, showTabs = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {showTabs && (
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
        )}

        {/* Content Card */}
        <div className="bg-white rounded-md shadow-sm p-5">
            <div className="flex justify-end">      
                <img src="/logo/Logo.svg" alt="CanSys" className="h-9 w-9" />      
            </div>
          <div className="items-start flex flex-col gap-1 pb-4"> 
            <h2 className="text-2xl mt-[-10px] font-bold text-gray-800">{title}</h2>
            <p className="text-gray-600 text-xs">{subtitle}</p>
          </div>   
          <DottedSeparator className="mb-2"/>    
          {children}
        </div>
      </div>
    </div>
  );
} 