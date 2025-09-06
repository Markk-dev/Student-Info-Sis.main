import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, PhilippinePeso, ShoppingCart, Clock, CreditCard, CheckCircle, LogOut, Key, ChevronDown } from 'lucide-react';
import { transactionService, studentService } from '@/lib/services';
import { getUpcomingDuePayments, getDueDateCountdown, getPaymentAlarmLevel } from '@/lib/paymentTracking';
import { format } from 'date-fns';
import { DottedSeparator } from '../ui/dotted-line';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  amount: number;
  timestamp: Date;
  items?: string[];
  cashier: string;
  status: string;
}

interface StudentData {
  id: string; // Document ID for fetching student data
  studentId: string; // Student ID for fetching transactions
  name: string;
  course: string;
  yearLevel: string;
}

interface StudentDashboardProps {
  studentData: StudentData;
}

export function StudentDashboard({ studentData }: StudentDashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [studentInfo, setStudentInfo] = useState<{
    loyalty: number;
    isActive: boolean;
    canMakeTransactions: boolean;
  }>({
    loyalty: 50,
    isActive: true,
    canMakeTransactions: true
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [upcomingDuePayments, setUpcomingDuePayments] = useState<any[]>([]);
  const itemsPerPage = 5;

  
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const { settingsService } = await import('@/lib/services');
        const maintenanceStatus = await settingsService.isSystemInMaintenance();
        setIsMaintenance(maintenanceStatus);
      } catch (error) {
        console.error('Error checking maintenance status:', error);
      }
    };
    
    checkMaintenance();
  }, []);

  
  useEffect(() => {
    const loadStudentData = async () => {
      try {
        setLoading(true);
        
        // Load transactions
        const response = await transactionService.getTransactions();
        const studentTransactions = response.documents
          .filter((txn: any) => txn.studentId === studentData.studentId)
          .map((txn: any) => {
            let timestamp: Date;
            try {
              // Try $createdAt first (Appwrite's automatic timestamp), then createdAt
              const dateString = txn.$createdAt || txn.createdAt;
              timestamp = new Date(dateString);
              if (isNaN(timestamp.getTime())) {
                timestamp = new Date(); 
              }
            } catch (error) {
              timestamp = new Date(); 
            }
            
            return {
              id: txn.$id,
              amount: txn.amount,
              timestamp: timestamp,
              items: txn.items || [],
              cashier: txn.cashierId || 'Admin',
              status: txn.status || 'Unknown'
            };
          })
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by timestamp descending (newest first)
        
        console.log('Raw transactions before sorting:', response.documents
          .filter((txn: any) => txn.studentId === studentData.studentId)
          .map(txn => ({
            id: txn.$id,
            $createdAt: txn.$createdAt,
            createdAt: txn.createdAt,
            amount: txn.amount
          }))); // Debug log
        
        console.log('Sorted transactions:', studentTransactions.map(t => ({
          id: t.id,
          timestamp: t.timestamp,
          amount: t.amount
        }))); // Debug log
        
        setTransactions(studentTransactions);
        
        // Load student info from database
        try {
          const studentInfo = await studentService.getStudent(studentData.id);
          setStudentInfo({
            loyalty: studentInfo.loyalty || 50,
            isActive: studentInfo.isActive !== false, // Default to true if not set
            canMakeTransactions: studentInfo.loyalty >= 50 // Can make transactions if loyalty >= 50
          });
        } catch (error) {
          console.error('Error loading student info:', error);
          // Fallback to default values
          setStudentInfo({
            loyalty: 50,
            isActive: true,
            canMakeTransactions: true
          });
        }
        
        // Load upcoming due payments
        try {
          const duePayments = await getUpcomingDuePayments(studentData.studentId);
          setUpcomingDuePayments(duePayments);
        } catch (error) {
          console.error('Error loading upcoming due payments:', error);
          setUpcomingDuePayments([]);
        }
        
      } catch (error) {
        console.error('Error loading student data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [studentData.id]);

  // Refresh upcoming due payments frequently to update countdown and alarm levels
  useEffect(() => {
    const refreshDuePayments = async () => {
      try {
        const duePayments = await getUpcomingDuePayments(studentData.studentId);
        setUpcomingDuePayments(duePayments);
      } catch (error) {
        console.error('Error refreshing upcoming due payments:', error);
      }
    };

    // Refresh immediately
    refreshDuePayments();

    // Set up interval to refresh every 30 seconds for more responsive updates
    const interval = setInterval(refreshDuePayments, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [studentData.studentId]);

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
    
    try {
      // Here you would implement the actual password change logic
      // For now, just show success message
      toast.success('Password changed successfully');
      setShowChangePassword(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Failed to change password');
    }
  };

  const handleLogout = () => {
    try {
      // Clear any stored authentication data
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      
      // Show logout message
      toast.success('Logged out successfully');
      
      // Redirect to login page or reload
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error during logout');
    }
  };

  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };



  
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalTransactions = transactions.length;
  const averageTransaction = totalTransactions > 0 ? totalSpent / totalTransactions : 0;

  // Pagination logic
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

  
  // const filteredTransactions = useMemo(() => {
  //   const now = new Date();
  //   let startDate: Date;
  //   let endDate: Date;

  //   switch (selectedPeriod) {
  //     case 'thisMonth':
  //       startDate = getStartOfMonth(now);
  //       endDate = getEndOfMonth(now);
  //       break;
  //     case 'lastMonth':
  //       const lastMonth = subtractMonths(now, 1);
  //       startDate = getStartOfMonth(lastMonth);
  //       endDate = getEndOfMonth(lastMonth);
  //       break;
  //     case 'thisWeek':
  //       const startOfWeek = new Date(now);
  //       startOfWeek.setDate(now.getDate() - now.getDay());
  //       startDate = startOfWeek;
  //       endDate = now;
  //       break;
  //     default:
  //       startDate = new Date(0);
  //       endDate = now;
  //   }

  //   return transactions.filter(t => {
      
  //     if (!t.timestamp || isNaN(t.timestamp.getTime())) {
  //       return false; 
  //     }
  //     return isWithinRange(t.timestamp, startDate, endDate);
  //   });
  // }, [transactions, selectedPeriod]);

  
  const chartData = useMemo(() => {
    const monthlyData = new Map<string, number>();
    
    transactions.forEach(t => {
      
      if (t.timestamp && !isNaN(t.timestamp.getTime())) {
        const monthKey = format(t.timestamp, 'MMM yyyy');
        monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + t.amount);
      }
    });

    return Array.from(monthlyData.entries()).map(([month, amount]) => ({
      month,
      amount: parseFloat(amount.toFixed(2))
    }));
  }, [transactions]);

  const categoryData = useMemo(() => {
    const categories = new Map<string, number>();
    
    transactions.forEach(t => {
      const category = t.status || 'Other';
      // Use absolute value for display purposes to ensure positive values in the chart
      const amount = Math.abs(t.amount);
      categories.set(category, (categories.get(category) || 0) + amount);
    });

    return Array.from(categories.entries()).map(([category, amount]) => ({
      name: category,
      value: parseFloat(amount.toFixed(2))
    }));
  }, [transactions]);

  const COLORS = ['#14a800', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Maintenance Mode Warning */}
      {isMaintenance && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
            <div>
              <h3 className="font-semibold text-yellow-800">System Maintenance Active</h3>
              <p className="text-sm text-yellow-700">
                The system is currently under maintenance. Some features may be limited or unavailable.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Due Warning */}
      {upcomingDuePayments.length > 0 && (
        <div className="space-y-1">
          {upcomingDuePayments.map((payment, index) => {
            const alarm = getPaymentAlarmLevel(payment);
            const countdown = getDueDateCountdown(payment.dueDate);
            const dueDate = new Date(payment.dueDate);
            const totalAmount = Math.abs(payment.totalItemAmount || payment.amount);
            
            return (
              <div key={payment.$id || index} className={`p-1.5 sm:p-2 ${alarm.bgColor} border ${alarm.borderColor} rounded shadow-sm`}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 ${alarm.color === 'red' ? 'bg-red-500' : alarm.color === 'orange' ? 'bg-orange-500' : 'bg-blue-500'} rounded-full animate-pulse flex-shrink-0`}></div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs sm:text-sm ${alarm.textColor} font-semibold leading-tight`}>
                      <span className="font-bold">₱{totalAmount.toFixed(2)}</span> due{' '}
                      {countdown.isOverdue ? (
                        <span className="font-bold text-red-600">
                          {countdown.daysRemaining === 0 ? 'TODAY' : `${Math.abs(countdown.daysRemaining)}d ago`}
                        </span>
                      ) : countdown.isDueToday ? (
                        <span className="font-bold text-red-600">TODAY</span>
                      ) : countdown.isDueSoon ? (
                        <span className="font-bold text-orange-600">
                          in {countdown.daysRemaining}d
                        </span>
                      ) : (
                        <span className="font-semibold">
                          {dueDate.toLocaleDateString()}
                        </span>
                      )}
                    </p>
                    {alarm.level === 'critical' && (
                      <p className={`text-xs ${alarm.textColor} font-medium leading-tight`}>
                        {alarm.deductionWarning.replace(/[🔥🚨⚠️]/g, '').trim()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div className='flex flex-col gap-1 sm:gap-2'>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-500">Welcome back, {studentData.name}!</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
           <span>Student ID:</span> {studentData.studentId}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* User Dropdown - Replaces Logout text */}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
        <Card className='bg-green-500'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-white">Total Spent</CardTitle>
            <PhilippinePeso className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground text-white"/>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">₱{totalSpent.toFixed(2)}</div>
            <DottedSeparator className='my-1 sm:my-2'/>
            <p className="text-xs text-muted-foreground text-white">
              All time spending
            </p>
          </CardContent>
        </Card>

        <Card className='bg-green-500'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-white">Total Transactions</CardTitle>
            <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground text-white"/>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground text-white">
              Number of purchases
            </p>
          </CardContent>
        </Card>

        <Card className='bg-green-500'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-white">Average Transaction</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground text-white" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">₱{averageTransaction.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground text-white">
              Per transaction
            </p>
          </CardContent>
        </Card>

        <Card className='bg-green-500'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-white">Last Transaction</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground text-white" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
              {transactions.length > 0 ? formatDate(transactions[0].timestamp) : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground text-white">
              Most recent purchase
            </p>
          </CardContent>
        </Card>

        <Card className='bg-green-500'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-white">Loyalty Points</CardTitle>
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground text-white" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${
              studentInfo.loyalty >= 100 ? 'text-yellow-300' :
              studentInfo.loyalty >= 90 ? 'text-blue-200' :
              studentInfo.loyalty >= 50 ? 'text-white' : 'text-red-200'
            }`}>
              {studentInfo.loyalty}/100
            </div>
            <p className="text-xs text-muted-foreground text-white">
              Current balance
            </p>
          </CardContent>
        </Card>

        <Card className='bg-green-500'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-white">Account Status</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground text-white" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                {studentInfo.isActive ? 'Active' : 'Suspended'}
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                {studentInfo.isActive ? 'Active' : 'Suspended'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground text-white mt-1">
              {studentInfo.isActive ? 'Account operational' : 'Account restricted'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Spending Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Spending Trend</CardTitle>
            <CardDescription>Monthly spending over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`₱${value}`, 'Amount']} />
                <Line type="monotone" dataKey="amount" stroke="#14a800" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Spending by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Breakdown of spending by transaction status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₱${value}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Your latest purchases and transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paginatedTransactions.map((transaction) => (
              <div key={transaction.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-4">
                <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                  <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
                    <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">Transaction ID: <span className='text-muted-foreground text-xs sm:text-sm'>{transaction.id}</span></p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {formatDate(transaction.timestamp)} at {formatTime(transaction.timestamp)}
                    </p>
                    {transaction.items && transaction.items.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        Items: {transaction.items.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:block sm:text-right">
                  <div className="flex flex-col sm:block">
                    <p className={`font-semibold text-sm sm:text-base ${
                      transaction.status === 'Credit' 
                        ? 'text-red-600' 
                        : transaction.status === 'Partial' 
                          ? 'text-yellow-600' 
                          : ''
                    }`}>
                      ₱{transaction.amount.toFixed(2)}
                    </p>
                    <Badge variant="outline" className={`text-xs w-fit ${
                      transaction.status === 'Partial' 
                        ? 'bg-yellow-200 text-yellow-900 border-yellow-300' 
                        : ''
                    }`}>
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
            
            {transactions.length === 0 && (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground">
                  Your purchase history will appear here
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-6 py-4 border-t gap-4">
              <div className="text-xs sm:text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="text-xs px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">First</span>
                  <span className="sm:hidden">1st</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="text-xs px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage <= 2) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 1) {
                      pageNum = totalPages - 2 + i;
                    } else {
                      pageNum = currentPage - 1 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-6 h-6 sm:w-8 sm:h-8 p-0 text-xs"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="text-xs px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="text-xs px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">Last</span>
                  <span className="sm:hidden">Last</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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