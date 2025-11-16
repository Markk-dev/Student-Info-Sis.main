import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { processDailyLoyaltyDeductions, updateOverdueStatus, getAllOverdueTransactions, getDeductionSummary } from '@/lib/paymentTracking';
import { hasJobRunToday, getLastJobExecution, logJobStart, logJobCompletion } from '@/lib/jobExecutionLog';
import { toast } from 'sonner';

interface JobStatus {
  isRunning: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
  overdueCount: number;
  error: string | null;
  hasRunToday: boolean;
}

export function DailyJobProcessor() {
  const [jobStatus, setJobStatus] = useState<JobStatus>({
    isRunning: false,
    lastRun: null,
    nextRun: null,
    overdueCount: 0,
    error: null,
    hasRunToday: false
  });

  const [overdueTransactions, setOverdueTransactions] = useState<any[]>([]);

  // Calculate next run time (daily at 6 AM)
  const calculateNextRun = () => {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(6, 0, 0, 0);

    // If it's already past 6 AM today or job has run today, set for tomorrow
    if (now.getHours() >= 6 || jobStatus.hasRunToday) {
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
    if (jobStatus.isRunning || jobStatus.hasRunToday) return;

    setJobStatus(prev => ({ ...prev, isRunning: true, error: null }));

    let executionId: string | null = null;

    try {
      console.log('Starting daily job...');

      // Log job start
      executionId = await logJobStart('daily_payment_processing', 'manual');

      // Update overdue status first
      await updateOverdueStatus();

      // Process loyalty deductions
      const result = await processDailyLoyaltyDeductions();

      // Reload overdue transactions
      await loadOverdueTransactions();

      const now = new Date();
      const newStatus = {
        isRunning: false,
        lastRun: now,
        nextRun: calculateNextRun(),
        hasRunToday: true,
        error: null
      };

      setJobStatus(prev => ({ ...prev, ...newStatus }));

      // Persist to localStorage
      saveJobStatus({
        lastRun: now,
        hasRunToday: true
      });

      // Log job completion
      if (executionId) {
        await logJobCompletion(
          executionId,
          'completed',
          result.processedCount,
          result.deductedCount,
          result.errors
        );
      }

      toast.success(`Daily job completed successfully! Processed ${result.processedCount} transactions, applied ${result.deductedCount} deductions.`);
    } catch (error) {
      console.error('Error running daily job:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setJobStatus(prev => ({
        ...prev,
        isRunning: false,
        error: errorMessage
      }));

      // Log job failure
      if (executionId) {
        await logJobCompletion(executionId, 'failed', 0, 0, [errorMessage]);
      }

      toast.error('Daily job failed: ' + errorMessage);
    }
  };

  // Load job status from database and localStorage
  const loadJobStatus = async () => {
    try {
      // Check database first for authoritative status
      const hasRunTodayDB = await hasJobRunToday('daily_payment_processing');
      const lastExecution = await getLastJobExecution('daily_payment_processing');

      setJobStatus(prev => ({
        ...prev,
        lastRun: lastExecution ? new Date(lastExecution.endTime || lastExecution.startTime) : null,
        hasRunToday: hasRunTodayDB,
        nextRun: calculateNextRun()
      }));

      // Also save to localStorage for faster loading next time
      saveJobStatus({
        lastRun: lastExecution ? new Date(lastExecution.endTime || lastExecution.startTime) : null,
        hasRunToday: hasRunTodayDB
      });
    } catch (error) {
      console.error('Error loading job status from database:', error);
      // Fallback to localStorage
      loadPersistedJobStatus();
    }
  };

  // Load persisted job status from localStorage (fallback)
  const loadPersistedJobStatus = () => {
    try {
      const saved = localStorage.getItem('dailyJobStatus');
      if (saved) {
        const parsed = JSON.parse(saved);
        const lastRun = parsed.lastRun ? new Date(parsed.lastRun) : null;
        const hasRun = lastRun ? lastRun.toDateString() === new Date().toDateString() : false;

        setJobStatus(prev => ({
          ...prev,
          lastRun,
          hasRunToday: hasRun,
          nextRun: calculateNextRun()
        }));
      }
    } catch (error) {
      console.error('Error loading persisted job status:', error);
    }
  };

  // Save job status to localStorage
  const saveJobStatus = (status: Partial<JobStatus>) => {
    try {
      const currentSaved = localStorage.getItem('dailyJobStatus');
      const current = currentSaved ? JSON.parse(currentSaved) : {};
      const updated = { ...current, ...status };
      localStorage.setItem('dailyJobStatus', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving job status:', error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadOverdueTransactions();
    loadJobStatus();
  }, []);

  // Auto-run job at 6 AM and reset hasRunToday at midnight
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();

      // Reset hasRunToday at midnight
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        setJobStatus(prev => ({ ...prev, hasRunToday: false }));
        saveJobStatus({ hasRunToday: false });
      }

      // Auto-run at 6 AM if not already run today
      if (now.getHours() === 6 && now.getMinutes() === 0 && !jobStatus.hasRunToday) {
        runDailyJob();
      }
    };

    const interval = setInterval(checkTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [jobStatus.hasRunToday]);

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
    <div className="space-y-4">
      {/* Job Status Card */}
      <Card className="compact">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {getStatusIcon()}
            Daily Payment Processing Job
          </CardTitle>
          <CardDescription className="text-sm">
            Automatically processes overdue payments and loyalty point deductions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Status</p>
              <p className="text-sm font-semibold">{getStatusText()}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Last Run</p>
              <p className="text-sm font-semibold">
                {jobStatus.lastRun ? formatDate(jobStatus.lastRun) : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Next Run</p>
              <p className="text-sm font-semibold">
                {jobStatus.nextRun ? formatDate(jobStatus.nextRun) : 'Not scheduled'}
              </p>
            </div>
          </div>

          {jobStatus.error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-800">
                <strong>Error:</strong> {jobStatus.error}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={runDailyJob}
              disabled={jobStatus.isRunning || jobStatus.hasRunToday}
              className="flex-1"
              size="sm"
            >
              {jobStatus.isRunning ? 'Processing...' :
                jobStatus.hasRunToday ? 'Already Run Today' : 'Run Now'}
            </Button>
            <Button
              onClick={loadOverdueTransactions}
              variant="outline"
              disabled={jobStatus.isRunning}
              size="sm"
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Transactions Card */}
      <Card className="compact">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Overdue Transactions
            <Badge variant="secondary" className="ml-2 text-xs">
              {overdueTransactions.length}
            </Badge>
          </CardTitle>
          <CardDescription className="text-sm">
            Transactions that are past their due date and may have loyalty deductions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overdueTransactions.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No overdue transactions</p>
              <p className="text-xs text-muted-foreground">
                All payments are up to date
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdueTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.$id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Student: {transaction.studentId}</p>
                      <p className="text-xs text-muted-foreground">
                        ₱{Math.abs(transaction.amount).toFixed(2)} • Due: {transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="text-xs mb-1">
                      {transaction.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Deductions: {transaction.loyaltyDeductions || 0} | Days overdue: {getDeductionSummary(transaction).daysOverdue}
                    </p>
                  </div>
                </div>
              ))}

              {overdueTransactions.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  And {overdueTransactions.length - 5} more...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
