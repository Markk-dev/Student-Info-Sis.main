import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@/lib/services';
import type { Student, Admin } from '@/lib/appwrite';

interface User {
  type: 'admin' | 'student';
  data: Admin | Student;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userType: 'admin' | 'student', userData: Admin | Student) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading] = useState(false); 

  
  useEffect(() => {
    const storedUser = localStorage.getItem('canteen_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('canteen_user');
      }
    }
  }, []);

  const login = (userType: 'admin' | 'student', userData: Admin | Student) => {
    const userInfo = { type: userType, data: userData };
    setUser(userInfo);
    
    localStorage.setItem('canteen_user', JSON.stringify(userInfo));
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      
      localStorage.removeItem('canteen_user');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 