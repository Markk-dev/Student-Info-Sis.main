import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, TrendingDown, PhilippinePeso, ShoppingCart, Settings, Target, RefreshCw  } from 'lucide-react';
import { studentService, transactionService } from '@/lib/services';
import { format, subDays, startOfDay, endOfDay, getHours } from 'date-fns';
import { toast } from 'sonner';
import { DottedSeparator } from '../ui/dotted-line';

const COLORS = ['#14a800', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [monthlyTarget, setMonthlyTarget] = useState(() => {
    
    const saved = localStorage.getItem('monthlyTarget');
    return saved ? parseFloat(saved) : 50000; 
  });
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudentsToday: 0,
    dailyRevenue: 0,
    yesterdayRevenue: 0,
    weeklyRevenue: 0,
    lastWeekRevenue: 0,
    monthlyRevenue: 0,
    totalTransactions: 0,
    dailyTransactions: 0,
    yesterdayTransactions: 0,
    averageTransaction: 0
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [courseData, setCourseData] = useState<any[]>([]);
  const [peakHoursData, setPeakHoursData] = useState<any[]>([]);
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
        
        // Check maintenance mode
        try {
          const { settingsService } = await import('@/lib/services');
          const maintenanceStatus = await settingsService.isSystemInMaintenance();
          setIsMaintenance(maintenanceStatus);
        } catch (error) {
          console.error('Error checking maintenance status:', error);
        }
        
        // Load admins/cashiers
        const [studentsResponse, transactionsResponse] = await Promise.all([
          studentService.getStudents(),
          transactionService.getTransactions()
        ]);

        const students = studentsResponse.documents;
        const transactions = transactionsResponse.documents;
        // const products = productsResponse.documents;

        
        const studentsMap = new Map();
        students.forEach((student: any) => {
          studentsMap.set(student.studentId, student);
        });

        
        const transformedTransactions = transactions.map((txn: any) => {
          const student = studentsMap.get(txn.studentId);
          
          
          let timestamp: Date;
          try {
            // Appwrite stores timestamps in ISO format, parse directly
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
            notes: txn.notes
          };
        });

        
        const totalStudents = students.length;
        const totalTransactions = transformedTransactions.length;
        const totalRevenue = transformedTransactions
          .filter((txn: any) => txn.status !== 'Credit')
          .reduce((sum: number, txn: any) => sum + (txn.totalItemAmount || 0), 0);
        const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

        
        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);
        const dailyRevenue = transformedTransactions
          .filter((txn: any) => {
            if (!txn.timestamp || isNaN(txn.timestamp.getTime())) return false;
            return txn.timestamp >= todayStart && txn.timestamp <= todayEnd && txn.status !== 'Credit';
          })
          .reduce((sum: number, txn: any) => {
            // For revenue, use the actual money received (transactionAmount)
            // For paid transactions, use totalItemAmount
            // For partial transactions, use transactionAmount (actual money received)
            if (txn.status === 'Partial') {
              return sum + (txn.transactionAmount || 0);
            } else {
              return sum + (txn.totalItemAmount || 0);
            }
          }, 0);

        
        const dailyTransactions = transformedTransactions
          .filter((txn: any) => {
            if (!txn.timestamp || isNaN(txn.timestamp.getTime())) return false;
            return txn.timestamp >= todayStart && txn.timestamp <= todayEnd && txn.status !== 'Credit';
          }).length;

        
        const yesterday = subDays(today, 1);
        const yesterdayStart = startOfDay(yesterday);
        const yesterdayEnd = endOfDay(yesterday);
        const yesterdayRevenue = transformedTransactions
          .filter((txn: any) => {
            if (!txn.timestamp || isNaN(txn.timestamp.getTime())) return false;
            return txn.timestamp >= yesterdayStart && txn.timestamp <= yesterdayEnd && txn.status !== 'Credit';
          })
          .reduce((sum: number, txn: any) => {
            // For revenue, use the actual money received (transactionAmount)
            if (txn.status === 'Partial') {
              return sum + (txn.transactionAmount || 0);
            } else {
              return sum + (txn.totalItemAmount || 0);
            }
          }, 0);

        
        const yesterdayTransactions = transformedTransactions
          .filter((txn: any) => {
            if (!txn.timestamp || isNaN(txn.timestamp.getTime())) return false;
            return txn.timestamp >= yesterdayStart && txn.timestamp <= yesterdayEnd && txn.status !== 'Credit';
          }).length;

        
        const weekAgo = subDays(today, 7);
        const weeklyRevenue = transformedTransactions
          .filter((txn: any) => {
            if (!txn.timestamp || isNaN(txn.timestamp.getTime())) return false;
            return txn.timestamp >= weekAgo && txn.status !== 'Credit';
          })
          .reduce((sum: number, txn: any) => {
            // For revenue, use the actual money received (transactionAmount)
            if (txn.status === 'Partial') {
              return sum + (txn.transactionAmount || 0);
            } else {
              return sum + (txn.totalItemAmount || 0);
            }
          }, 0);

        
        const lastWeekStart = subDays(today, 14);
        const lastWeekEnd = subDays(today, 8);
        const lastWeekRevenue = transformedTransactions
          .filter((txn: any) => {
            if (!txn.timestamp || isNaN(txn.timestamp.getTime())) return false;
            return txn.timestamp >= lastWeekStart && txn.timestamp <= lastWeekEnd && txn.status !== 'Credit';
          })
          .reduce((sum: number, txn: any) => {
            // For revenue, use the actual money received (transactionAmount)
            if (txn.status === 'Partial') {
              return sum + (txn.transactionAmount || 0);
            } else {
              return sum + (txn.totalItemAmount || 0);
            }
          }, 0);

        
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthlyRevenue = transformedTransactions
          .filter((txn: any) => {
            if (!txn.timestamp || isNaN(txn.timestamp.getTime())) return false;
            return txn.timestamp >= monthStart && txn.status !== 'Credit';
          })
          .reduce((sum: number, txn: any) => {
            // For revenue, use the actual money received (transactionAmount)
            if (txn.status === 'Partial') {
              return sum + (txn.transactionAmount || 0);
            } else {
              return sum + (txn.totalItemAmount || 0);
            }
          }, 0);

        
        const activeStudents = students.filter((student: any) => student.isActive === true).length;

        setStats({
          totalStudents,
          activeStudentsToday: activeStudents,
          dailyRevenue,
          yesterdayRevenue,
          weeklyRevenue,
          lastWeekRevenue,
          monthlyRevenue,
          totalTransactions,
          dailyTransactions,
          yesterdayTransactions,
          averageTransaction
        });

        
        const revenueData = [];
        for (let i = 6; i >= 0; i--) {
          const date = subDays(today, i);
          const dayStart = startOfDay(date);
          const dayEnd = endOfDay(date);
          
          const dayRevenue = transformedTransactions
            .filter((txn: any) => {
              if (!txn.timestamp || isNaN(txn.timestamp.getTime())) return false;
              return txn.timestamp >= dayStart && txn.timestamp <= dayEnd && txn.status !== 'Credit';
            })
            .reduce((sum: number, txn: any) => {
              // For revenue, use the actual money received (transactionAmount)
              if (txn.status === 'Partial') {
                return sum + (txn.transactionAmount || 0);
              } else {
                return sum + (txn.totalItemAmount || 0);
              }
            }, 0);

          revenueData.push({
            name: format(date, 'EEE'),
            revenue: parseFloat(dayRevenue.toFixed(2))
          });
        }
        setRevenueData(revenueData);

        
        const courseMap = new Map<string, number>();
        transformedTransactions.forEach((txn: any) => {
          const course = txn.course;
          courseMap.set(course, (courseMap.get(course) || 0) + 1);
        });

        const courseData = Array.from(courseMap.entries())
          .map(([course, count]) => ({
            name: course,
            purchases: count,
            percentage: Math.round((count / totalTransactions) * 100)
          }))
          .sort((a, b) => b.purchases - a.purchases)
          .slice(0, 5);

        setCourseData(courseData);

        
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

        
        // Sort transactions by timestamp (newest first), then by ID as fallback
        const sortedTransactions = transformedTransactions.sort((a, b) => {
          const timeDiff = b.timestamp.getTime() - a.timestamp.getTime();
          if (timeDiff !== 0) return timeDiff;
          // If timestamps are the same, sort by ID (newer IDs come first)
          return b.id.localeCompare(a.id);
        });
        
        const recentSales = sortedTransactions
          .slice(0, 4)
          .map((txn: any) => ({
            id: txn.id,
            studentId: txn.studentId,
            name: txn.studentName,
            amount: txn.amount,
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Refresh dashboard when window regains focus (e.g., when returning from transaction page)
  useEffect(() => {
    const handleFocus = () => {
      loadDashboardData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Listen for new transaction events and refresh dashboard
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
    <div className="space-y-6">
      {/* Dashboard Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of your student information system</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => loadDashboardData()}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <DottedSeparator className="my-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>{stats.activeStudentsToday} active students</span>
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
            <div className="text-2xl font-bold">₱{stats.dailyRevenue.toFixed(2)}</div>
            <DottedSeparator className="my-3" />
            <div className="space-y-2">
              <div className={`flex items-center gap-1 text-sm ${
                stats.dailyRevenue >= stats.yesterdayRevenue ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.dailyRevenue >= stats.yesterdayRevenue ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>
                  {stats.yesterdayRevenue > 0 ? 
                    `${Math.abs(((stats.dailyRevenue - stats.yesterdayRevenue) / stats.yesterdayRevenue) * 100).toFixed(1)}% from yesterday` :
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
            <div className="text-2xl font-bold">₱{stats.weeklyRevenue.toFixed(2)}</div>
            <DottedSeparator className="my-3" />
            <div className={`flex items-center gap-2 text-sm ${
              stats.weeklyRevenue >= stats.lastWeekRevenue ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.weeklyRevenue >= stats.lastWeekRevenue ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {stats.lastWeekRevenue > 0 ? 
                  `${Math.abs(((stats.weeklyRevenue - stats.lastWeekRevenue) / stats.lastWeekRevenue) * 100).toFixed(1)}% from last week` :
                  '0% from last week'
                }
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ShoppingCart className="h-5 w-5 text-muted-foreground text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <DottedSeparator className="my-3" />
            <div className={`flex items-center gap-2 text-sm ${
              stats.dailyTransactions >= stats.yesterdayTransactions ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.dailyTransactions >= stats.yesterdayTransactions ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {stats.yesterdayTransactions > 0 ? 
                  `${Math.abs(((stats.dailyTransactions - stats.yesterdayTransactions) / stats.yesterdayTransactions) * 100).toFixed(1)}% from yesterday` :
                  '0% from yesterday'
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader className='bg-primary rounded-t-lg mb-4'>
            <CardTitle className='font-bold text-white'>Revenue Trend</CardTitle>
            <CardDescription className='text-white'>Daily revenue for the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350} className='text-xs'>
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
          <CardHeader className='bg-primary rounded-t-lg mb-4'>
            <CardTitle className='font-bold text-white'>Transactions by Course</CardTitle>
            <CardDescription className='text-white'>Breakdown of transactions by student course</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative w-64 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={courseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
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
                
                {/* Center text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-foreground">
                      {stats.totalTransactions}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Transactions
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="mt-6 space-y-2">
              {courseData.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{entry.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {entry.purchases} ({entry.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <Card className="py-0">
          <CardHeader className="flex flex-col border-b items-stretch !p-0 sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
              <CardTitle>Peak Transaction Hours</CardTitle>
              <CardDescription>Transaction volume throughout the day</CardDescription>
            </div>
            <div className="flex">
              <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:px-8 sm:py-6 bg-muted/50">
                <span className="text-muted-foreground text-xs">Peak Hour</span>
                <span className="text-lg leading-none font-bold sm:text-3xl text-primary">
                {peakHoursData.length > 0 ? 
                  peakHoursData.find(item => item.transactions === Math.max(...peakHoursData.map(h => h.transactions)))?.time || '' 
                  : ''
                }
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:p-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={peakHoursData}
                margin={{
                  left: 12,
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
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
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
            <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>Latest transactions</CardDescription>
            </div>
            <div className="flex">
              <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:px-8 sm:py-6 bg-muted/50">
                <span className="text-muted-foreground text-xs">Today's Sales</span>
                <span className="text-lg leading-none font-bold sm:text-3xl text-primary">
                  {stats.dailyTransactions}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:p-6">
            <div className="space-y-4">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{sale.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.studentId} • {sale.course}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₱{sale.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{sale.time}</p>
                  </div>
                </div>
              ))}
              
              {recentSales.length === 0 && (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent transactions</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Average Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{stats.averageTransaction.toFixed(2)}</div>
            <Progress value={Math.min((stats.averageTransaction / 200) * 100, 100)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Per transaction average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
          <CardContent>
            <div className="text-2xl font-bold">₱{stats.monthlyRevenue.toFixed(2)}</div>
            <Progress value={Math.min((stats.monthlyRevenue / monthlyTarget) * 100, 100)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Target: ₱{monthlyTarget.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {isMaintenance ? (
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              ) : (
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              )}
              <span className="text-sm font-medium">
                {isMaintenance ? 'Maintenance Mode Active' : 'All Systems Operational'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isMaintenance ? 'Application is in maintenance mode. Some features may be unavailable.' : 'Database, authentication, and services running normally'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}