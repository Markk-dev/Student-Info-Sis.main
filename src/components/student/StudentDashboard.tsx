import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, PhilippinePeso, ShoppingCart, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { transactionService } from '@/lib/services';
import { format } from 'date-fns';
import { DottedSeparator } from '../ui/dotted-line';

interface Transaction {
  id: string;
  amount: number;
  timestamp: Date;
  items?: string[];
  cashier: string;
  status: string;
}

interface StudentData {
  id: string;
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [isMaintenance, setIsMaintenance] = useState(false);

  
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
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const response = await transactionService.getTransactions();
        
        
        const studentTransactions = response.documents
          .filter((txn: any) => txn.studentId === studentData.id)
          .map((txn: any) => {
            
            let timestamp: Date;
            try {
              timestamp = new Date(txn.createdAt);
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
          });
        
        setTransactions(studentTransactions);
      } catch (error) {
        console.error('Error loading transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [studentData.id]);

  
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

  const formatDateLong = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStartOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getEndOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  const subtractMonths = (date: Date, months: number) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() - months);
    return result;
  };

  const isWithinRange = (date: Date, start: Date, end: Date) => {
    return date >= start && date <= end;
  };

  
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalTransactions = transactions.length;
  const averageTransaction = totalTransactions > 0 ? totalSpent / totalTransactions : 0;

  
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
      categories.set(category, (categories.get(category) || 0) + t.amount);
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

      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div className='flex flex-col gap-2'>
          <h1 className="text-3xl font-bold text-green-500">Welcome back, {studentData.name}!</h1>
          <p className="text-muted-foreground">
           <span>Student ID:</span> {studentData.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {formatDateLong(new Date())}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className='bg-green-500'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Spent</CardTitle>
            <PhilippinePeso className="h-4 w-4 text-muted-foreground text-white"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">₱{totalSpent.toFixed(2)}</div>
            <DottedSeparator className='my-2'/>
            <p className="text-xs text-muted-foreground text-white">
              All time spending
            </p>
          </CardContent>
        </Card>

        <Card className='bg-green-500'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground text-white"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground text-white">
              Number of purchases
            </p>
          </CardContent>
        </Card>

        <Card className='bg-green-500'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Average Transaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">₱{averageTransaction.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground text-white">
              Per transaction
            </p>
          </CardContent>
        </Card>

        <Card className='bg-green-400'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Last Transaction</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {transactions.length > 0 ? formatDate(transactions[0].timestamp) : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground text-white">
              Most recent purchase
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  {categoryData.map((entry, index) => (
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
            {transactions.slice(0, 5).map((transaction, index) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Transaction ID: <span className='text-muted-foreground'>{transaction.id}</span></p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(transaction.timestamp)} at {formatTime(transaction.timestamp)}
                    </p>
                    {transaction.items && transaction.items.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Items: {transaction.items.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₱{transaction.amount.toFixed(2)}</p>
                  <Badge variant="outline" className="text-xs">
                    {transaction.status}
                  </Badge>
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
        </CardContent>
      </Card>
    </div>
  );
}