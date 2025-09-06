/**
 * Daily Job Scheduler for Payment Processing
 * 
 * This module handles the automatic processing of overdue payments,
 * loyalty point deductions, and account suspensions/banning.
 * 
 * The job should be run daily at 6:00 AM to process all overdue transactions.
 */

import { processDailyLoyaltyDeductions, updateOverdueStatus } from './paymentTracking';

export class DailyJobScheduler {
  private static instance: DailyJobScheduler;
  private isRunning = false;
  private lastRun: Date | null = null;
  private nextRun: Date | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {
    this.calculateNextRun();
  }

  public static getInstance(): DailyJobScheduler {
    if (!DailyJobScheduler.instance) {
      DailyJobScheduler.instance = new DailyJobScheduler();
    }
    return DailyJobScheduler.instance;
  }

  /**
   * Calculate the next run time (6:00 AM daily)
   */
  private calculateNextRun(): void {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(6, 0, 0, 0);
    
    // If it's already past 6 AM today, set for tomorrow
    if (now.getHours() >= 6) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    this.nextRun = nextRun;
  }

  /**
   * Start the daily job scheduler
   */
  public start(): void {
    if (this.intervalId) {
      console.log('Daily job scheduler is already running');
      return;
    }

    console.log('Starting daily job scheduler...');
    
    // Run immediately if it's past 6 AM and we haven't run today
    const now = new Date();
    if (now.getHours() >= 6 && (!this.lastRun || this.lastRun.toDateString() !== now.toDateString())) {
      this.runJob();
    }

    // Check every minute if it's time to run
    this.intervalId = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 6 && now.getMinutes() === 0 && 
          (!this.lastRun || this.lastRun.toDateString() !== now.toDateString())) {
        this.runJob();
      }
    }, 60000); // Check every minute

    console.log(`Daily job scheduler started. Next run: ${this.nextRun?.toLocaleString()}`);
  }

  /**
   * Stop the daily job scheduler
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Daily job scheduler stopped');
    }
  }

  /**
   * Run the daily job manually
   */
  public async runJob(): Promise<void> {
    if (this.isRunning) {
      console.log('Daily job is already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    
    try {
      console.log('Starting daily job at', startTime.toLocaleString());
      
      // Step 1: Update overdue status for all transactions
      console.log('Step 1: Updating overdue status...');
      await updateOverdueStatus();
      
      // Step 2: Process loyalty deductions for overdue transactions
      console.log('Step 2: Processing loyalty deductions...');
      await processDailyLoyaltyDeductions();
      
      this.lastRun = new Date();
      this.calculateNextRun();
      
      const duration = Date.now() - startTime.getTime();
      console.log(`Daily job completed successfully in ${duration}ms`);
      console.log(`Next run scheduled for: ${this.nextRun?.toLocaleString()}`);
      
    } catch (error) {
      console.error('Daily job failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get the current status of the scheduler
   */
  public getStatus(): {
    isRunning: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
    isActive: boolean;
  } {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      isActive: this.intervalId !== null
    };
  }

  /**
   * Force run the job (for testing or manual execution)
   */
  public async forceRun(): Promise<void> {
    console.log('Force running daily job...');
    await this.runJob();
  }
}

// Export singleton instance
export const dailyJobScheduler = DailyJobScheduler.getInstance();

// Auto-start the scheduler when the module is imported
if (typeof window === 'undefined') {
  // Only auto-start on server side
  dailyJobScheduler.start();
}
