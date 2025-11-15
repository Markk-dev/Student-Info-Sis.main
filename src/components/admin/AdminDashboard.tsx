import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, TrendingDown, PhilippinePeso, ShoppingCart, Settings, Target, RefreshCw, Clock, Download } from 'lucide-react';
import { studentService, transactionService } from '@/lib/services';
import { format, subDays, startOfDay, endOfDay, getHours } from 'date-fns';
import { toast } from 'sonner';
import { DottedSeparator } from '../ui/dotted-line';
import { DailyJobProcessor } from './DailyJobProcessor';

const COLORS = ['#14a800', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];

type DashboardStats = {
  totalStudents: number;
  activeStudentsToday: number;
  activeStudentsWeek: number;
  dailyRevenue: number;
  yesterdayRevenue: number;
  weeklyRevenue: number;
  lastWeekRevenue: number;
  monthlyRevenue: number;
  totalTransactions: number;
  dailyTransactions: number;
  weeklyTransactions: number;
  yesterdayTransactions: number;
  averageTransaction: number;
};

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [monthlyTarget, setMonthlyTarget] = useState(() => {

    const saved = localStorage.getItem('monthlyTarget');
    return saved ? parseFloat(saved) : 50000;
  });
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudentsToday: 0,
    activeStudentsWeek: 0,
    dailyRevenue: 0,
    yesterdayRevenue: 0,
    weeklyRevenue: 0,
    lastWeekRevenue: 0,
    monthlyRevenue: 0,
    totalTransactions: 0,
    dailyTransactions: 0,
    weeklyTransactions: 0,
    yesterdayTransactions: 0,
    averageTransaction: 0
  });
  const [revenueData, setRevenueData] = useState<{ name: string; date: string; revenue: number }[]>([]);
  const [courseData, setCourseData] = useState<any[]>([]);
  const [courseDataToday, setCourseDataToday] = useState<{ name: string; transactions: number; revenue: number }[]>([]);
  const [courseDataWeek, setCourseDataWeek] = useState<{ name: string; transactions: number; revenue: number }[]>([]);
  const [peakHoursData, setPeakHoursData] = useState<any[]>([]);
  const [peakHourToday, setPeakHourToday] = useState('N/A');
  const [peakHourTodayCount, setPeakHourTodayCount] = useState(0);
  const [recentSales, setRecentSales] = useState<any[]>([]);

  const handleSetMonthlyTarget = () => {
    const target = parseFloat(newTarget);
    if (isNaN(target) || target < 0) {
      toast.error('Please enter a valid target amount');
      return;
    }
    setMonthlyTarget(target);

    localStorage.setItem('monthlyTarget', target.toString());
    setShowTargetDialog(false);
    setNewTarget('');
    toast.success(`Monthly target set to ₱${target.toFixed(2)}`);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      
      try {
        const { settingsService } = await import('@/lib/services');
        const maintenanceStatus = await settingsService.isSystemInMaintenance();
        setIsMaintenance(maintenanceStatus);
      } catch (error) {
        console.error('Error checking maintenance status:', error);
      }

      
      const [studentsResponse, transactionsResponse] = await Promise.all([
        studentService.getStudents(),
        transactionService.getTransactions()
      ]);

      const students = studentsResponse.documents;
      const transactions = transactionsResponse.documents;
      


      const studentsMap = new Map();
      students.forEach((student: any) => {
        studentsMap.set(student.studentId, student);
      });


      const transformedTransactions = transactions.map((txn: any) => {
        const student = studentsMap.get(txn.studentId);

        let timestamp: Date;
        try {
          
          timestamp = new Date(txn.$createdAt || txn.createdAt);
          if (isNaN(timestamp.getTime())) {
            console.warn('Invalid timestamp for transaction:', txn.$id, txn.$createdAt);
            timestamp = new Date();
          }
        } catch (error) {
          console.warn('Error parsing timestamp for transaction:', txn.$id, error);
          timestamp = new Date();
        }

        return {
          id: txn.$id,
          studentId: txn.studentId,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
          course: student ? student.course : 'Unknown',
          amount: txn.amount,
          transactionAmount: txn.transactionAmount,
          itemPrices: txn.itemPrices,
          totalItemAmount: txn.totalItemAmount,
          timestamp: timestamp,
          cashier: txn.cashierId || 'Admin',
          status: txn.status || 'completed',
        };
      });

      const getTransactionRevenue = (txn: any) => {
        if (txn.status === 'Bought Token') {
          return txn.totalItemAmount || txn.amount || 0;
        }
        if (txn.status === 'Paid (Token)' || txn.status === 'Paid') {
          return txn.totalItemAmount || 0;
        }
        if (txn.status === 'Partial') {
          return txn.transactionAmount || 0;
        }
        return txn.totalItemAmount || 0;
      };

      const isValidRevenueTransaction = (txn: any) =>
        txn.timestamp && !isNaN(txn.timestamp.getTime()) && txn.status !== 'Credit';


      const totalStudents = students.length;
      const totalTransactions = transformedTransactions.length;
      const totalRevenue = transformedTransactions
        .filter((txn: any) => txn.status !== 'Credit')
        .reduce((sum: number, txn: any) => sum + getTransactionRevenue(txn), 0);
      const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;


      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      const transactionsToday = transformedTransactions.filter((txn: any) => {
        if (!isValidRevenueTransaction(txn)) return false;
        return txn.timestamp >= todayStart && txn.timestamp <= todayEnd;
      });
      const dailyRevenue = transactionsToday.reduce(
        (sum: number, txn: any) => sum + getTransactionRevenue(txn),
        0
      );
      const dailyTransactions = transactionsToday.length;


      const yesterday = subDays(today, 1);
      const yesterdayStart = startOfDay(yesterday);
      const yesterdayEnd = endOfDay(yesterday);
      const transactionsYesterday = transformedTransactions.filter((txn: any) => {
        if (!isValidRevenueTransaction(txn)) return false;
        return txn.timestamp >= yesterdayStart && txn.timestamp <= yesterdayEnd;
      });
      const yesterdayRevenue = transactionsYesterday.reduce(
        (sum: number, txn: any) => sum + getTransactionRevenue(txn),
        0
      );
      const yesterdayTransactions = transactionsYesterday.length;


      const weekAgo = subDays(today, 7);
      const transactionsThisWeek = transformedTransactions.filter((txn: any) => {
        if (!isValidRevenueTransaction(txn)) return false;
        return txn.timestamp >= weekAgo;
      });
      const weeklyRevenue = transactionsThisWeek.reduce(
        (sum: number, txn: any) => sum + getTransactionRevenue(txn),
        0
      );
      const weeklyTransactions = transactionsThisWeek.length;


      const lastWeekStart = subDays(today, 14);
      const lastWeekEnd = subDays(today, 8);
      const transactionsLastWeek = transformedTransactions.filter((txn: any) => {
        if (!isValidRevenueTransaction(txn)) return false;
        return txn.timestamp >= lastWeekStart && txn.timestamp <= lastWeekEnd;
      });
      const lastWeekRevenue = transactionsLastWeek.reduce(
        (sum: number, txn: any) => sum + getTransactionRevenue(txn),
        0
      );


      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const transactionsThisMonth = transformedTransactions.filter((txn: any) => {
        if (!isValidRevenueTransaction(txn)) return false;
        return txn.timestamp >= monthStart;
      });
      const monthlyRevenue = transactionsThisMonth.reduce(
        (sum: number, txn: any) => sum + getTransactionRevenue(txn),
        0
      );


      
      const activeStudents = students.filter((student: any) => {
        if (!student.isActive) {
          return false; 
        }

        
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const studentTransactions = transformedTransactions.filter((txn: any) =>
          txn.studentId === student.studentId
        );

        const recentTransactions = studentTransactions.filter((txn: any) => {
          try {
            return txn.timestamp && !isNaN(txn.timestamp.getTime()) && txn.timestamp >= threeDaysAgo;
          } catch (error) {
            return false;
          }
        });

        return recentTransactions.length >= 3;
      }).length;

      const activeStudentsWeek = students.filter((student: any) => {
        if (!student.isActive) {
          return false;
        }

        return transactionsThisWeek.some((txn: any) => txn.studentId === student.studentId);
      }).length;

      setStats({
        totalStudents,
        activeStudentsToday: activeStudents,
        activeStudentsWeek,
        dailyRevenue,
        yesterdayRevenue,
        weeklyRevenue,
        lastWeekRevenue,
        monthlyRevenue,
        totalTransactions,
        dailyTransactions,
        weeklyTransactions,
        yesterdayTransactions,
        averageTransaction
      });


      const revenueData = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const dayTransactions = transformedTransactions.filter((txn: any) => {
          if (!isValidRevenueTransaction(txn)) return false;
          return txn.timestamp >= dayStart && txn.timestamp <= dayEnd;
        });
        const dayRevenue = dayTransactions.reduce(
          (sum: number, txn: any) => sum + getTransactionRevenue(txn),
          0
        );

        revenueData.push({
          name: format(date, 'EEE'),
          date: format(date, 'yyyy-MM-dd'),
          revenue: parseFloat(dayRevenue.toFixed(2))
        });
      }
      setRevenueData(revenueData);


      const calculateCourseStats = (txns: any[]) => {
        const courseMap = new Map<string, { count: number; revenue: number }>();

        txns.forEach((txn: any) => {
          const course = txn.course || 'Unknown';
          const existing = courseMap.get(course) || { count: 0, revenue: 0 };
          courseMap.set(course, {
            count: existing.count + 1,
            revenue: existing.revenue + getTransactionRevenue(txn)
          });
        });

        return Array.from(courseMap.entries()).map(([name, data]) => ({
          name,
          transactions: data.count,
          revenue: parseFloat(data.revenue.toFixed(2))
        }));
      };

      const overallCourseStats = calculateCourseStats(
        transformedTransactions.filter((txn: any) => txn.status !== 'Credit')
      );
      const totalCourseTransactions = overallCourseStats.reduce((sum, item) => sum + item.transactions, 0);
      const courseData = overallCourseStats
        .map((item) => ({
          name: item.name,
          purchases: item.transactions,
          percentage: totalCourseTransactions > 0
            ? Math.round((item.transactions / totalCourseTransactions) * 100)
            : 0
        }))
        .sort((a, b) => b.purchases - a.purchases)
        .slice(0, 5);

      setCourseData(courseData);
      setCourseDataToday(calculateCourseStats(transactionsToday));
      setCourseDataWeek(calculateCourseStats(transactionsThisWeek));


      const hourMap = new Map<number, number>();
      for (let i = 0; i < 24; i++) {
        hourMap.set(i, 0);
      }

      transformedTransactions.forEach((txn: any) => {
        if (txn.timestamp && !isNaN(txn.timestamp.getTime())) {
          const hour = getHours(txn.timestamp);
          hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
        }
      });

      const peakHoursData = Array.from(hourMap.entries())
        .map(([hour, count]) => ({
          time: `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'PM' : 'AM'}`,
          transactions: count
        }))
        .sort((a, b) => {
          const hourA = parseInt(a.time.replace(/\D/g, ''));
          const hourB = parseInt(b.time.replace(/\D/g, ''));
          return hourA - hourB;
        });

      setPeakHoursData(peakHoursData);

      const todayHourMap = new Map<number, number>();
      for (let i = 0; i < 24; i++) {
        todayHourMap.set(i, 0);
      }

      transactionsToday.forEach((txn: any) => {
        if (txn.timestamp && !isNaN(txn.timestamp.getTime())) {
          const hour = getHours(txn.timestamp);
          todayHourMap.set(hour, (todayHourMap.get(hour) || 0) + 1);
        }
      });

      const formatHourLabel = (hour: number) => {
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        const period = hour >= 12 ? 'PM' : 'AM';
        return `${displayHour}${period}`;
      };

      let peakHourLabel = 'N/A';
      let peakHourCount = 0;
      todayHourMap.forEach((count, hour) => {
        if (count > peakHourCount) {
          peakHourCount = count;
          peakHourLabel = formatHourLabel(hour);
        }
      });

      if (peakHourCount === 0) {
        peakHourLabel = 'N/A';
      }

      setPeakHourToday(peakHourLabel);
      setPeakHourTodayCount(peakHourCount);


      
      const sortedTransactions = transformedTransactions.sort((a, b) => {
        const timeDiff = b.timestamp.getTime() - a.timestamp.getTime();
        if (timeDiff !== 0) return timeDiff;
        
        return b.id.localeCompare(a.id);
      });

      const recentSales = sortedTransactions
        .slice(0, 4)
        .map((txn: any) => ({
          id: txn.id,
          studentId: txn.studentId,
          name: txn.studentName,
          amount: txn.status === 'Bought Token' 
            ? Math.abs(txn.totalItemAmount || txn.amount || 0)
            : Math.abs(txn.amount || 0),
          status: txn.status || 'Paid',
          time: format(txn.timestamp, 'MMM dd, HH:mm'),
          course: txn.course.substring(0, 3).toUpperCase()
        }));

      setRecentSales(recentSales);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportSales = () => {
    if (loading) {
      toast.error('Dashboard data is still loading');
      return;
    }

    const rows: string[] = [];
    const wrap = (value: string | number) => {
      const str = value === undefined || value === null ? '' : value.toString();
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const appendRow = (values: (string | number)[]) => {
      const normalised = values.map((value) => {
        if (typeof value === 'number' && !Number.isFinite(value)) {
          return '';
        }
        return value;
      });
      rows.push(normalised.map(wrap).join(','));
    };

    const formatNumber = (amount: number) => amount.toFixed(2);

    rows.push(wrap('Summary'));
    appendRow(['Metric', 'Value']);
    appendRow(['Total Active Students This Week', stats.activeStudentsWeek]);
    appendRow(['Todays Revenue', formatNumber(stats.dailyRevenue)]);
    appendRow(['This Weeks Revenue', formatNumber(stats.weeklyRevenue)]);
    appendRow(['Total Transactions Today', stats.dailyTransactions]);
    appendRow(['Total Transactions This Week', stats.weeklyTransactions]);
    appendRow(['Average Transaction Value', formatNumber(stats.averageTransaction)]);
    appendRow(['Peak Transaction Hour Today', peakHourToday]);
    appendRow(['Transactions During Peak Hour Today', peakHourTodayCount]);
    rows.push('');

    rows.push(wrap('Daily Revenue (Past 7 Days)'));
    appendRow(['Date', 'Revenue']);
    revenueData.forEach((day) => {
      appendRow([day.date, formatNumber(day.revenue)]);
    });
    rows.push('');

    rows.push(wrap('Transactions by Course (Today)'));
    appendRow(['Course', 'Transactions', 'Revenue']);
    if (courseDataToday.length === 0) {
      appendRow(['No data', 0, formatNumber(0)]);
    } else {
      courseDataToday.forEach((course) => {
        appendRow([course.name, course.transactions, formatNumber(course.revenue)]);
      });
    }
    rows.push('');

    rows.push(wrap('Transactions by Course (This Week)'));
    appendRow(['Course', 'Transactions', 'Revenue']);
    if (courseDataWeek.length === 0) {
      appendRow(['No data', 0, formatNumber(0)]);
    } else {
      courseDataWeek.forEach((course) => {
        appendRow([course.name, course.transactions, formatNumber(course.revenue)]);
      });
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_metrics_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Dashboard data exported');
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  
  useEffect(() => {
    const handleFocus = () => {
      loadDashboardData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  
  useEffect(() => {
    const handleTransactionCreated = () => {
      console.log('TransactionCreated event received, refreshing dashboard...');
      loadDashboardData();
    };

    window.addEventListener('transactionCreated', handleTransactionCreated);
    return () => window.removeEventListener('transactionCreated', handleTransactionCreated);
  }, []);

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
    <div className="space-y-4">
      {/* Dashboard Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your student information system</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportSales}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export Sales</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => loadDashboardData()}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.totalStudents}</div>
            <DottedSeparator className="my-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>{stats.activeStudentsToday} active</span>
              <span>{stats.totalStudents > 0 ? Math.round((stats.activeStudentsToday / stats.totalStudents) * 100) : 0}%</span>
            </div>
            <Progress
              value={stats.totalStudents > 0 ? (stats.activeStudentsToday / stats.totalStudents) * 100 : 0}
              className="h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <PhilippinePeso className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">₱{stats.dailyRevenue.toFixed(2)}</div>
            <DottedSeparator className="my-2" />
            <div className="space-y-1">
              <div className={`flex items-center gap-1 text-xs md:text-sm ${stats.dailyRevenue >= stats.yesterdayRevenue ? 'text-green-600' : 'text-red-600'
                }`}>
                {stats.dailyRevenue >= stats.yesterdayRevenue ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="truncate">
                  {stats.yesterdayRevenue > 0 ?
                    `${Math.abs(((stats.dailyRevenue - stats.yesterdayRevenue) / stats.yesterdayRevenue) * 100).toFixed(0)}% from yesterday` :
                    '0% from yesterday'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Target className="h-5 w-5 text-muted-foreground text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">₱{stats.weeklyRevenue.toFixed(2)}</div>
            <DottedSeparator className="my-2" />
            <div className={`flex items-center gap-1 text-xs md:text-sm ${stats.weeklyRevenue >= stats.lastWeekRevenue ? 'text-green-600' : 'text-red-600'
              }`}>
              {stats.weeklyRevenue >= stats.lastWeekRevenue ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="truncate">
                {stats.lastWeekRevenue > 0 ?
                  `${Math.abs(((stats.weeklyRevenue - stats.lastWeekRevenue) / stats.lastWeekRevenue) * 100).toFixed(0)}% from last week` :
                  '0% from last week'
                }
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <ShoppingCart className="h-5 w-5 text-muted-foreground text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.totalTransactions}</div>
            <DottedSeparator className="my-2" />
            <div className={`flex items-center gap-1 text-xs md:text-sm ${stats.dailyTransactions >= stats.yesterdayTransactions ? 'text-green-600' : 'text-red-600'
              }`}>
              {stats.dailyTransactions >= stats.yesterdayTransactions ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="truncate">
                {stats.yesterdayTransactions > 0 ?
                  `${Math.abs(((stats.dailyTransactions - stats.yesterdayTransactions) / stats.yesterdayTransactions) * 100).toFixed(0)}% from yesterday` :
                  '0% from yesterday'
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <Card>
          <CardHeader className='bg-primary rounded-t-lg mb-2 p-4'>
            <CardTitle className='font-bold text-white text-base'>Revenue Trend</CardTitle>
            <CardDescription className='text-white text-xs'>Daily revenue for the past week</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={250} className='text-xs'>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`₱${value}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#14a800" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transactions by Course */}
        <Card>
          <CardHeader className='bg-primary rounded-t-lg mb-2 p-4'>
            <CardTitle className='font-bold text-white text-base'>Transactions by Course</CardTitle>
            <CardDescription className='text-white text-xs'>Breakdown of transactions by student course</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={courseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="purchases"
                    >
                      {courseData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Transactions']} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {stats.totalTransactions}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 md:mt-0 space-y-2 w-full md:w-auto">
                {courseData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{entry.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {entry.purchases} ({entry.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Peak Hours */}
        <Card className="py-0">
          <CardHeader className="flex flex-col border-b items-stretch !p-0 sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-3 sm:!py-0">
              <CardTitle className="text-base">Peak Transaction Hours</CardTitle>
              <CardDescription className="text-xs">Transaction volume throughout the day</CardDescription>
            </div>
            <div className="flex">
              <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-4 py-3 text-left sm:border-t-0 sm:px-6 sm:py-4 bg-muted/50">
                <span className="text-muted-foreground text-xs">Peak Hour</span>
                <span className="text-lg leading-none font-bold sm:text-2xl text-primary">
                  {peakHoursData.length > 0 ?
                    peakHoursData.find(item => item.transactions === Math.max(...peakHoursData.map(h => h.transactions)))?.time || ''
                    : ''
                  }
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={peakHoursData}
                margin={{
                  left: 0,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value) => [value, 'Transactions']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar
                  dataKey="transactions"
                  fill="#14a800"
                  radius={[4, 4, 0, 0]}
                  className="hover:opacity-80 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="py-0">
          <CardHeader className="flex flex-col border-b items-stretch !p-0 sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-3 sm:!py-0">
              <CardTitle className="text-base">Recent Sales</CardTitle>
              <CardDescription className="text-xs">Latest transactions</CardDescription>
            </div>
            <div className="flex">
              <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-4 py-3 text-left sm:border-t-0 sm:px-6 sm:py-4 bg-muted/50">
                <span className="text-muted-foreground text-xs">Today's Sales</span>
                <span className="text-lg leading-none font-bold sm:text-2xl text-primary">
                  {stats.dailyTransactions}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:p-4">
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-primary/10 rounded-full">
                      <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{sale.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.studentId} • {sale.course}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">₱{sale.amount.toFixed(2)}</p>
                    <div className="flex items-center justify-end gap-1">
                      {sale.status && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            sale.status === 'Bought Token' 
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : sale.status === 'Paid (Token)'
                              ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
                              : sale.status === 'Partial'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              : sale.status === 'Credit'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-green-100 text-green-800 border-green-200'
                          }`}
                        >
                          {sale.status}
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground">{sale.time}</p>
                    </div>
                  </div>
                </div>
              ))}

              {recentSales.length === 0 && (
                <div className="text-center py-6">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No recent transactions</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm">Average Transaction</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold">₱{stats.averageTransaction.toFixed(2)}</div>
            <Progress value={Math.min((stats.averageTransaction / 200) * 100, 100)} className="mt-2 h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">
              Per transaction average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-sm">This Month</CardTitle>
            <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Monthly Revenue Target</DialogTitle>
                  <DialogDescription>
                    Set the target revenue for the current month
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="target">Monthly Target (₱)</Label>
                    <Input
                      id="target"
                      type="number"
                      placeholder="Enter target amount"
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSetMonthlyTarget()}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowTargetDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSetMonthlyTarget}>
                      Set Target
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold">₱{stats.monthlyRevenue.toFixed(2)}</div>
            <Progress value={Math.min((stats.monthlyRevenue / monthlyTarget) * 100, 100)} className="mt-2 h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">
              Target: ₱{monthlyTarget.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm">System Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center space-x-2">
              {isMaintenance ? (
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
              ) : (
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
              )}
              <span className="text-sm font-medium">
                {isMaintenance ? 'Maintenance Active' : 'Operational'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {isMaintenance ? 'System is in maintenance mode.' : 'All systems running normally.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Job Processor Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Payment Processing</h2>
        </div>
        <DailyJobProcessor />
      </div>
    </div>
  );
}