import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { transactionService } from '@/lib/services';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface Transaction {
  id: string;
  amount: number;
  timestamp: Date;
  items?: string[];
  cashier: string;
  type: string;
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

  // Load student transactions from database
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const response = await transactionService.getTransactions();
        
        // Filter transactions for this student
        const studentTransactions = response.documents
          .filter((txn: any) => txn.studentId === studentData.id)
          .map((txn: any) => {
            // Validate and create date safely
            let timestamp: Date;
            try {
              timestamp = new Date(txn.createdAt);
              if (isNaN(timestamp.getTime())) {
                timestamp = new Date(); // Fallback to current date if invalid
              }
            } catch (error) {
              timestamp = new Date(); // Fallback to current date if error
            }
            
            return {
              id: txn.$id,
              amount: txn.amount,
              timestamp: timestamp,
              items: txn.items || [],
              cashier: txn.cashierId || 'Admin',
              type: txn.type
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

  // Helper functions for date formatting
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

  // Calculate statistics
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalTransactions = transactions.length;
  const averageTransaction = totalTransactions > 0 ? totalSpent / totalTransactions : 0;

  // Filter transactions by selected period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (selectedPeriod) {
      case 'thisMonth':
        startDate = getStartOfMonth(now);
        endDate = getEndOfMonth(now);
        break;
      case 'lastMonth':
        const lastMonth = subtractMonths(now, 1);
        startDate = getStartOfMonth(lastMonth);
        endDate = getEndOfMonth(lastMonth);
        break;
      case 'thisWeek':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startDate = startOfWeek;
        endDate = now;
        break;
      default:
        startDate = new Date(0);
        endDate = now;
    }

    return transactions.filter(t => {
      // Validate timestamp before date comparison
      if (!t.timestamp || isNaN(t.timestamp.getTime())) {
        return false; // Skip invalid dates
      }
      return isWithinRange(t.timestamp, startDate, endDate);
    });
  }, [transactions, selectedPeriod]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const monthlyData = new Map<string, number>();
    
    transactions.forEach(t => {
      // Validate timestamp before using date-fns
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
      const category = t.type || 'Other';
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {studentData.name}!</h1>
          <p className="text-muted-foreground">
            {studentData.course} • {studentData.yearLevel}
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              All time spending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Number of purchases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{averageTransaction.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Transaction</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactions.length > 0 ? formatDate(transactions[0].timestamp) : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
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
            <CardDescription>Breakdown of spending by transaction type</CardDescription>
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
            {transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Transaction #{transaction.id.slice(-6)}</p>
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
                    {transaction.type}
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