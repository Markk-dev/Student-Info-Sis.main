import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { processDailyLoyaltyDeductions, updateOverdueStatus, getAllOverdueTransactions } from '@/lib/paymentTracking';
import { toast } from 'sonner';

interface JobStatus {
  isRunning: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
  overdueCount: number;
  error: string | null;
}

export function DailyJobProcessor() {
  const [jobStatus, setJobStatus] = useState<JobStatus>({
    isRunning: false,
    lastRun: null,
    nextRun: null,
    overdueCount: 0,
    error: null
  });

  const [overdueTransactions, setOverdueTransactions] = useState<any[]>([]);

  // Calculate next run time (daily at 6 AM)
  const calculateNextRun = () => {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(6, 0, 0, 0);
    
    // If it's already past 6 AM today, set for tomorrow
    if (now.getHours() >= 6) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun;
  };

  // Load overdue transactions
  const loadOverdueTransactions = async () => {
    try {
      const transactions = await getAllOverdueTransactions();
      setOverdueTransactions(transactions);
      setJobStatus(prev => ({ ...prev, overdueCount: transactions.length }));
    } catch (error) {
      console.error('Error loading overdue transactions:', error);
    }
  };

  // Run the daily job
  const runDailyJob = async () => {
    setJobStatus(prev => ({ ...prev, isRunning: true, error: null }));
    
    try {
      console.log('Starting daily job...');
      
      // Update overdue status first
      await updateOverdueStatus();
      
      // Process loyalty deductions
      await processDailyLoyaltyDeductions();
      
      // Reload overdue transactions
      await loadOverdueTransactions();
      
      setJobStatus(prev => ({
        ...prev,
        isRunning: false,
        lastRun: new Date(),
        nextRun: calculateNextRun(),
        error: null
      }));
      
      toast.success('Daily job completed successfully');
    } catch (error) {
      console.error('Error running daily job:', error);
      setJobStatus(prev => ({
        ...prev,
        isRunning: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
      toast.error('Daily job failed');
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadOverdueTransactions();
    setJobStatus(prev => ({ ...prev, nextRun: calculateNextRun() }));
  }, []);

  // Auto-run job at 6 AM (simplified - in production you'd use a proper cron job)
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      if (now.getHours() === 6 && now.getMinutes() === 0) {
        runDailyJob();
      }
    };

    const interval = setInterval(checkTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = () => {
    if (jobStatus.isRunning) {
      return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
    } else if (jobStatus.error) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusText = () => {
    if (jobStatus.isRunning) {
      return 'Running...';
    } else if (jobStatus.error) {
      return 'Error';
    } else {
      return 'Ready';
    }
  };

  return (
    <div className="space-y-6">
      {/* Job Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Daily Payment Processing Job
          </CardTitle>
          <CardDescription>
            Automatically processes overdue payments and loyalty point deductions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="text-lg font-semibold">{getStatusText()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Run</p>
              <p className="text-lg font-semibold">
                {jobStatus.lastRun ? formatDate(jobStatus.lastRun) : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Next Run</p>
              <p className="text-lg font-semibold">
                {jobStatus.nextRun ? formatDate(jobStatus.nextRun) : 'Not scheduled'}
              </p>
            </div>
          </div>

          {jobStatus.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {jobStatus.error}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={runDailyJob} 
              disabled={jobStatus.isRunning}
              className="flex-1"
            >
              {jobStatus.isRunning ? 'Processing...' : 'Run Now'}
            </Button>
            <Button 
              onClick={loadOverdueTransactions} 
              variant="outline"
              disabled={jobStatus.isRunning}
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Transactions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Overdue Transactions
            <Badge variant="secondary" className="ml-2">
              {overdueTransactions.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Transactions that are past their due date and may have loyalty deductions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overdueTransactions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">No overdue transactions</p>
              <p className="text-sm text-muted-foreground">
                All payments are up to date
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueTransactions.slice(0, 10).map((transaction) => (
                <div key={transaction.$id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Student: {transaction.studentId}</p>
                      <p className="text-sm text-muted-foreground">
                        Amount: ₱{Math.abs(transaction.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due: {transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="mb-1">
                      {transaction.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Deductions: {transaction.loyaltyDeductions || 0}
                    </p>
                  </div>
                </div>
              ))}
              
              {overdueTransactions.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  And {overdueTransactions.length - 10} more...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
