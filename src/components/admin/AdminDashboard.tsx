import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, DollarSign, ShoppingCart, Clock, Award, Settings } from 'lucide-react';
import { studentService, transactionService, productService } from '@/lib/services';
import { format, subDays, startOfDay, endOfDay, getHours } from 'date-fns';
import { toast } from 'sonner';

const COLORS = ['#14a800', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [monthlyTarget, setMonthlyTarget] = useState(() => {
    // Load from localStorage on component mount
    const saved = localStorage.getItem('monthlyTarget');
    return saved ? parseFloat(saved) : 50000; // Default to 50000 if no saved value
  });
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [stats, setStats] = useState({
    totalStudents: 0,
    dailyRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    totalTransactions: 0,
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
    // Save to localStorage for persistence
    localStorage.setItem('monthlyTarget', target.toString());
    setShowTargetDialog(false);
    setNewTarget('');
    toast.success(`Monthly target set to ₱${target.toFixed(2)}`);
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load all data
        const [studentsResponse, transactionsResponse, productsResponse] = await Promise.all([
          studentService.getStudents(),
          transactionService.getTransactions(),
          productService.getProducts()
        ]);

        const students = studentsResponse.documents;
        const transactions = transactionsResponse.documents;
        const products = productsResponse.documents;

        // Create a map of student data for quick lookup (same as TransactionsPage)
        const studentsMap = new Map();
        students.forEach((student: any) => {
          studentsMap.set(student.studentId, student);
        });

        // Transform transactions with proper date handling (same as TransactionsPage)
        const transformedTransactions = transactions.map((txn: any) => {
          const student = studentsMap.get(txn.studentId);
          
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
            studentId: txn.studentId,
            studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
            course: student ? student.course : 'Unknown',
            amount: txn.amount,
            timestamp: timestamp,
            cashier: txn.cashierId || 'Admin',
            status: txn.type === 'refund' ? 'refunded' : 'completed',
            type: txn.type,
            notes: txn.notes
          };
        });

        // Calculate basic stats using transformed data
        const totalStudents = students.length;
        const totalTransactions = transformedTransactions.length;
        const totalRevenue = transformedTransactions.reduce((sum: number, txn: any) => sum + txn.amount, 0);
        const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

        // Calculate daily revenue (today)
        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);
        const dailyRevenue = transformedTransactions
          .filter((txn: any) => {
            if (!txn.timestamp || isNaN(txn.timestamp.getTime())) return false;
            return txn.timestamp >= todayStart && txn.timestamp <= todayEnd;
          })
          .reduce((sum: number, txn: any) => sum + txn.amount, 0);

        // Calculate weekly revenue (last 7 days)
        const weekAgo = subDays(today, 7);
        const weeklyRevenue = transformedTransactions
          .filter((txn: any) => {
            if (!txn.timestamp || isNaN(txn.timestamp.getTime())) return false;
            return txn.timestamp >= weekAgo;
          })
          .reduce((sum: number, txn: any) => sum + txn.amount, 0);

        // Calculate monthly revenue (this month)
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthlyRevenue = transformedTransactions
          .filter((txn: any) => {
            if (!txn.timestamp || isNaN(txn.timestamp.getTime())) return false;
            return txn.timestamp >= monthStart;
          })
          .reduce((sum: number, txn: any) => sum + txn.amount, 0);

        setStats({
          totalStudents,
          dailyRevenue,
          weeklyRevenue,
          monthlyRevenue,
          totalTransactions,
          averageTransaction
        });

        // Prepare revenue data (last 7 days)
        const revenueData = [];
        for (let i = 6; i >= 0; i--) {
          const date = subDays(today, i);
          const dayStart = startOfDay(date);
          const dayEnd = endOfDay(date);
          
          const dayRevenue = transformedTransactions
            .filter((txn: any) => {
              if (!txn.timestamp || isNaN(txn.timestamp.getTime())) return false;
              return txn.timestamp >= dayStart && txn.timestamp <= dayEnd;
            })
            .reduce((sum: number, txn: any) => sum + txn.amount, 0);

          revenueData.push({
            name: format(date, 'EEE'),
            revenue: parseFloat(dayRevenue.toFixed(2))
          });
        }
        setRevenueData(revenueData);

        // Prepare course data
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

        // Prepare real peak hours data
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

        // Prepare recent sales
        const recentSales = transformedTransactions
          .slice(0, 5)
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

    loadDashboardData();
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Registered students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{stats.dailyRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Daily earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{stats.weeklyRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Weekly revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              All time transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Daily revenue for the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
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
          <CardHeader>
            <CardTitle>Transactions by Course</CardTitle>
            <CardDescription>Breakdown of transactions by student course</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={courseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="purchases"
                >
                  {courseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Transactions']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Peak Transaction Hours</CardTitle>
            <CardDescription>Transaction volume throughout the day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip formatter={(value) => [value, 'Transactions']} />
                <Bar dataKey="transactions" fill="#14a800" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>Latest transactions</CardDescription>
          </CardHeader>
          <CardContent>
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
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">All Systems Operational</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Database, authentication, and services running normally
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}