import { databases, DATABASE_ID, COLLECTIONS } from './appwrite';
import { Query } from 'appwrite';

// Payment terms based on purchase amount
export const PAYMENT_TERMS = {
  LOW: { min: 0, max: 50, days: 3 },
  MEDIUM: { min: 51, max: 99, days: 4 },
  HIGH: { min: 100, max: Infinity, days: 5 }
} as const;

// Loyalty deduction rates
export const LOYALTY_DEDUCTIONS = {
  GRACE_PERIOD: 0, // 12 hours after due date
  INITIAL: 1, // First deduction
  ESCALATED: 4, // Daily deduction after first
  MAX_DAILY: 4 // Maximum daily deduction
} as const;

// Account status thresholds
export const ACCOUNT_THRESHOLDS = {
  SUSPENSION: 20, // Suspend account at 20 points
  BAN_LOW: 5, // Ban for 5 days if amount <= 50
  BAN_HIGH: 7 // Ban for 7 days if amount > 50
} as const;

// Philippine holidays for 2024-2025 (you can expand this)
export const PHILIPPINE_HOLIDAYS = [
  '2024-01-01', // New Year's Day
  '2024-02-09', // Chinese New Year
  '2024-02-10', // Chinese New Year
  '2024-03-28', // Maundy Thursday
  '2024-03-29', // Good Friday
  '2024-04-09', // Araw ng Kagitingan
  '2024-05-01', // Labor Day
  '2024-06-12', // Independence Day
  '2024-08-26', // National Heroes Day
  '2024-11-30', // Bonifacio Day
  '2024-12-25', // Christmas Day
  '2024-12-30', // Rizal Day
  '2025-01-01', // New Year's Day
  '2025-01-28', // Chinese New Year
  '2025-01-29', // Chinese New Year
  '2025-04-17', // Maundy Thursday
  '2025-04-18', // Good Friday
  '2025-04-21', // Easter Monday
  '2025-05-01', // Labor Day
  '2025-06-12', // Independence Day
  '2025-08-25', // National Heroes Day
  '2025-11-30', // Bonifacio Day
  '2025-12-25', // Christmas Day
  '2025-12-30', // Rizal Day
];

/**
 * Calculate payment terms based on purchase amount
 */
export function getPaymentTerms(amount: number): number {
  if (amount <= PAYMENT_TERMS.LOW.max) {
    return PAYMENT_TERMS.LOW.days;
  } else if (amount <= PAYMENT_TERMS.MEDIUM.max) {
    return PAYMENT_TERMS.MEDIUM.days;
  } else {
    return PAYMENT_TERMS.HIGH.days;
  }
}

/**
 * Calculate due date considering weekends and holidays
 */
export function calculateDueDate(transactionDate: Date, amount: number): Date {
  const paymentDays = getPaymentTerms(amount);
  let dueDate = new Date(transactionDate);
  
  // Add payment days
  dueDate.setDate(dueDate.getDate() + paymentDays);
  
  // Adjust for weekends and holidays
  dueDate = adjustForWeekendsAndHolidays(dueDate);
  
  return dueDate;
}

/**
 * Adjust due date to avoid weekends and holidays
 */
export function adjustForWeekendsAndHolidays(date: Date): Date {
  const adjustedDate = new Date(date);
  
  while (isWeekend(adjustedDate) || isHoliday(adjustedDate)) {
    adjustedDate.setDate(adjustedDate.getDate() + 1);
  }
  
  return adjustedDate;
}

/**
 * Check if a date falls on weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if a date is a Philippine holiday
 */
export function isHoliday(date: Date): boolean {
  const dateString = date.toISOString().split('T')[0];
  return PHILIPPINE_HOLIDAYS.includes(dateString);
}

/**
 * Check if a transaction is overdue
 */
export function isTransactionOverdue(transaction: any): boolean {
  if (!transaction.dueDate) return false;
  
  const dueDate = new Date(transaction.dueDate);
  const now = new Date();
  
  // Add 24-hour grace period (1 day)
  const gracePeriod = new Date(dueDate.getTime() + 24 * 60 * 60 * 1000);
  
  return now > gracePeriod;
}

/**
 * Calculate loyalty points to deduct for overdue transaction
 * Only deducts if no deduction has been made today
 */
export function calculateLoyaltyDeduction(transaction: any): number {
  if (!isTransactionOverdue(transaction)) return 0;
  
  const dueDate = new Date(transaction.dueDate);
  const now = new Date();
  
  // Grace period: 24 hours (1 day) after due date
  const gracePeriod = new Date(dueDate.getTime() + 24 * 60 * 60 * 1000);
  
  // If still in grace period, no deduction
  if (now <= gracePeriod) return 0;
  
  // Check if we already deducted today
  const lastDeductionDate = transaction.lastDeductionDate ? new Date(transaction.lastDeductionDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (lastDeductionDate) {
    const lastDeductionDay = new Date(lastDeductionDate);
    lastDeductionDay.setHours(0, 0, 0, 0);
    
    // If we already deducted today, don't deduct again
    if (lastDeductionDay.getTime() === today.getTime()) {
      return 0;
    }
  }
  
  // Calculate days overdue (after grace period)
  const daysOverdue = Math.floor((now.getTime() - gracePeriod.getTime()) / (1000 * 60 * 60 * 24));
  
  // Deduction phases based on days overdue:
  if (daysOverdue >= 5) {
    // Phase 3: 5+ days overdue → 4 points deduction (highest)
    return 4;
  } else if (daysOverdue >= 2) {
    // Phase 2: 2-4 days overdue → 2 points deduction
    return 2;
  } else {
    // Phase 1: 1 day overdue (after grace period) → 1 point deduction
    return 1;
  }
}

/**
 * Check if account should be suspended based on loyalty points
 */
export function shouldSuspendAccount(loyaltyPoints: number): boolean {
  return loyaltyPoints <= ACCOUNT_THRESHOLDS.SUSPENSION;
}

/**
 * Check if account should be banned based on loyalty points and amount
 */
export function shouldBanAccount(loyaltyPoints: number, amount: number): { shouldBan: boolean; banDays: number } {
  if (loyaltyPoints > 0) {
    return { shouldBan: false, banDays: 0 };
  }
  
  const banDays = amount <= 50 ? ACCOUNT_THRESHOLDS.BAN_LOW : ACCOUNT_THRESHOLDS.BAN_HIGH;
  return { shouldBan: true, banDays };
}

/**
 * Check if a transaction has been processed for deduction today
 */
export function hasBeenProcessedToday(transaction: any): boolean {
  if (!transaction.lastDeductionDate) return false;
  
  const lastDeductionDate = new Date(transaction.lastDeductionDate);
  const today = new Date();
  
  // Compare dates (ignore time)
  return lastDeductionDate.toDateString() === today.toDateString();
}

/**
 * Calculate countdown to due date
 */
export function getDueDateCountdown(dueDate: string): {
  daysRemaining: number;
  hoursRemaining: number;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean; // Within 2 days
} {
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(diffMs / (1000 * 60 * 60));
  
  const isOverdue = diffMs < 0;
  const isDueToday = daysRemaining === 0 && !isOverdue;
  const isDueSoon = daysRemaining <= 2 && daysRemaining > 0;
  
  return {
    daysRemaining: Math.max(0, daysRemaining),
    hoursRemaining: Math.max(0, hoursRemaining),
    isOverdue,
    isDueToday,
    isDueSoon
  };
}

/**
 * Get alarm level and message for payment due
 */
export function getPaymentAlarmLevel(transaction: any): {
  level: 'info' | 'warning' | 'danger' | 'critical';
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  message: string;
  deductionWarning: string;
} {
  const due = new Date(transaction.dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const hoursOverdue = Math.abs(diffMs) / (1000 * 60 * 60);
  
  // Grace period: 24 hours (1 day) after due date
  const gracePeriodHours = 24;
  
  if (diffMs > 0) {
    // Not yet due
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 1) {
      return {
        level: 'warning',
        color: 'orange',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        textColor: 'text-orange-800',
        message: 'PAYMENT DUE SOON!',
        deductionWarning: 'Pay now to avoid loyalty point deductions!'
      };
    } else if (daysRemaining <= 2) {
      return {
        level: 'info',
        color: 'blue',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        textColor: 'text-blue-800',
        message: 'Payment Due',
        deductionWarning: 'Make payment to avoid deductions'
      };
    } else {
      return {
        level: 'info',
        color: 'blue',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        textColor: 'text-blue-800',
        message: 'Payment Due',
        deductionWarning: 'Make payment to avoid deductions'
      };
    }
  } else if (hoursOverdue <= gracePeriodHours) {
    // Within grace period (24 hours)
    return {
      level: 'danger',
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      textColor: 'text-red-800',
      message: 'PAYMENT OVERDUE - GRACE PERIOD!',
      deductionWarning: `Grace period ends in ${Math.ceil(gracePeriodHours - hoursOverdue)} hours! After that, 1 point will be deducted!`
    };
  } else {
    // After grace period - calculate actual days overdue
    const gracePeriodEnd = new Date(due.getTime() + gracePeriodHours * 60 * 60 * 1000);
    const actualDaysOverdue = Math.floor((now.getTime() - gracePeriodEnd.getTime()) / (1000 * 60 * 60 * 24));
    
    if (actualDaysOverdue >= 5) {
      // Phase 3: 5+ days overdue → 4 points deduction
      return {
        level: 'critical',
        color: 'red',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-500',
        textColor: 'text-red-900',
        message: 'PAYMENT SEVERELY OVERDUE!',
        deductionWarning: `${actualDaysOverdue} days overdue! 4 loyalty points deducted daily! Account suspension risk!`
      };
    } else if (actualDaysOverdue >= 2) {
      // Phase 2: 2-4 days overdue → 2 points deduction
      return {
        level: 'critical',
        color: 'red',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-500',
        textColor: 'text-red-900',
        message: 'PAYMENT OVERDUE - DEDUCTIONS ESCALATED!',
        deductionWarning: `${actualDaysOverdue} days overdue! 2 loyalty points deducted daily!`
      };
    } else {
      // Phase 1: 1 day overdue (after grace period) → 1 point deduction
      return {
        level: 'critical',
        color: 'red',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-500',
        textColor: 'text-red-900',
        message: 'PAYMENT OVERDUE - DEDUCTIONS STARTED!',
        deductionWarning: `${actualDaysOverdue + 1} days overdue! 1 loyalty point deducted daily!`
      };
    }
  }
}

/**
 * Get deduction summary for a transaction
 */
export function getDeductionSummary(transaction: any): {
  totalDeductions: number;
  daysOverdue: number;
  canDeductToday: boolean;
  nextDeductionAmount: number;
} {
  const totalDeductions = transaction.loyaltyDeductions || 0;
  const canDeductToday = !hasBeenProcessedToday(transaction);
  const nextDeductionAmount = canDeductToday ? calculateLoyaltyDeduction(transaction) : 0;
  
  let daysOverdue = 0;
  if (transaction.dueDate) {
    const dueDate = new Date(transaction.dueDate);
    const gracePeriod = new Date(dueDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours grace period
    const now = new Date();
    
    if (now > gracePeriod) {
      daysOverdue = Math.floor((now.getTime() - gracePeriod.getTime()) / (1000 * 60 * 60 * 24));
    }
  }
  
  return {
    totalDeductions,
    daysOverdue,
    canDeductToday,
    nextDeductionAmount
  };
}

/**
 * Get all due payments for a student (both upcoming and overdue, but not paid)
 */
export async function getUpcomingDuePayments(studentId: string): Promise<any[]> {
  try {
    // Get both Partial and Credit transactions that have due dates and are not paid
    const partialResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      [
        Query.equal('studentId', studentId),
        Query.equal('status', 'Partial')
      ]
    );
    
    const creditResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      [
        Query.equal('studentId', studentId),
        Query.equal('status', 'Credit')
      ]
    );
    
    const allTransactions = [...partialResponse.documents, ...creditResponse.documents];
    
    // Filter to only include transactions with due dates (both upcoming and overdue)
    return allTransactions.filter(transaction => transaction.dueDate);
  } catch (error) {
    console.error('Error fetching upcoming due payments:', error);
    return [];
  }
}

/**
 * Get all overdue transactions for a student
 */
export async function getOverdueTransactions(studentId: string): Promise<any[]> {
  try {
    // Get both Partial and Credit transactions that are overdue for this student
    const partialResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      [
        Query.equal('studentId', studentId),
        Query.equal('status', 'Partial'),
        Query.equal('isOverdue', true)
      ]
    );
    
    const creditResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      [
        Query.equal('studentId', studentId),
        Query.equal('status', 'Credit'),
        Query.equal('isOverdue', true)
      ]
    );
    
    return [...partialResponse.documents, ...creditResponse.documents];
  } catch (error) {
    console.error('Error fetching overdue transactions:', error);
    return [];
  }
}

/**
 * Get all overdue transactions for all students
 */
export async function getAllOverdueTransactions(): Promise<any[]> {
  try {
    // Get both Partial and Credit transactions that are overdue
    const partialResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      [
        Query.equal('status', 'Partial'),
        Query.equal('isOverdue', true)
      ]
    );
    
    const creditResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      [
        Query.equal('status', 'Credit'),
        Query.equal('isOverdue', true)
      ]
    );
    
    return [...partialResponse.documents, ...creditResponse.documents];
  } catch (error) {
    console.error('Error fetching all overdue transactions:', error);
    return [];
  }
}

/**
 * Update transaction with due date and overdue status
 */
export async function updateTransactionDueDate(transactionId: string, dueDate: Date, isOverdue: boolean): Promise<void> {
  try {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      transactionId,
      {
        dueDate: dueDate.toISOString(),
        isOverdue: isOverdue
      }
    );
  } catch (error) {
    console.error('Error updating transaction due date:', error);
    throw error;
  }
}

/**
 * Deduct loyalty points from student
 */
export async function deductLoyaltyPoints(studentId: string, deductionAmount: number): Promise<void> {
  try {
    // Get current student data
    const studentsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.STUDENTS,
      [Query.equal('studentId', studentId)]
    );
    
    if (studentsResponse.documents.length === 0) {
      throw new Error('Student not found');
    }
    
    const student = studentsResponse.documents[0];
    const currentLoyalty = student.loyalty || 0;
    const newLoyalty = Math.max(0, currentLoyalty - deductionAmount);
    
    // Update student loyalty points
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.STUDENTS,
      student.$id,
      {
        loyalty: newLoyalty
      }
    );
    
    console.log(`Deducted ${deductionAmount} loyalty points from student ${studentId}. New total: ${newLoyalty}`);
  } catch (error) {
    console.error('Error deducting loyalty points:', error);
    throw error;
  }
}

/**
 * Suspend student account
 */
export async function suspendStudentAccount(studentId: string, reason: string = 'Low loyalty points'): Promise<void> {
  try {
    const studentsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.STUDENTS,
      [Query.equal('studentId', studentId)]
    );
    
    if (studentsResponse.documents.length === 0) {
      throw new Error('Student not found');
    }
    
    const student = studentsResponse.documents[0];
    
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.STUDENTS,
      student.$id,
      {
        isActive: false,
        suspensionDate: new Date().toISOString()
      }
    );
    
    console.log(`Suspended student account ${studentId}. Reason: ${reason}`);
  } catch (error) {
    console.error('Error suspending student account:', error);
    throw error;
  }
}

/**
 * Process daily loyalty deductions for overdue transactions
 */
export async function processDailyLoyaltyDeductions(): Promise<{ processedCount: number; deductedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let processedCount = 0;
  let deductedCount = 0;
  
  try {
    console.log('Starting daily loyalty deduction process...');
    
    // Get all overdue transactions
    const overdueTransactions = await getAllOverdueTransactions();
    
    for (const transaction of overdueTransactions) {
      try {
        const deductionAmount = calculateLoyaltyDeduction(transaction);
        processedCount++;
        
        if (deductionAmount > 0) {
          console.log(`Deducting ${deductionAmount} points from student ${transaction.studentId} for transaction ${transaction.$id}`);
          
          // Deduct loyalty points
          await deductLoyaltyPoints(transaction.studentId, deductionAmount);
          
          // Update transaction with deduction info
          const currentDeductions = transaction.loyaltyDeductions || 0;
          await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.TRANSACTIONS,
            transaction.$id,
            {
              loyaltyDeductions: currentDeductions + deductionAmount,
              lastDeductionDate: new Date().toISOString()
            }
          );
          
          deductedCount++;
          
          // Check if account should be suspended or banned
          const studentsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.STUDENTS,
            [Query.equal('studentId', transaction.studentId)]
          );
          
          if (studentsResponse.documents.length > 0) {
            const student = studentsResponse.documents[0];
            const newLoyalty = student.loyalty || 0;
            
            if (shouldSuspendAccount(newLoyalty)) {
              console.log(`Suspending account for student ${transaction.studentId} due to low loyalty points: ${newLoyalty}`);
              await suspendStudentAccount(transaction.studentId, 'Loyalty points below threshold');
            }
          }
        } else {
          console.log(`No deduction needed for transaction ${transaction.$id} (already processed today or not eligible)`);
        }
      } catch (error) {
        const errorMsg = `Error processing transaction ${transaction.$id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        // Continue with other transactions
      }
    }
    
    console.log(`Processed ${processedCount} overdue transactions, applied deductions to ${deductedCount} transactions`);
    return { processedCount, deductedCount, errors };
  } catch (error) {
    const errorMsg = `Error in daily loyalty deduction process: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { processedCount, deductedCount, errors };
  }
}

/**
 * Check and update overdue status for all transactions
 */
export async function updateOverdueStatus(): Promise<void> {
  try {
    console.log('Updating overdue status for all transactions...');
    
    // Get all partial and credit transactions
    const partialResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      [
        Query.equal('status', 'Partial')
      ]
    );
    
    const creditResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      [
        Query.equal('status', 'Credit')
      ]
    );
    
    const allTransactions = [...partialResponse.documents, ...creditResponse.documents];
    
    for (const transaction of allTransactions) {
      const isOverdue = isTransactionOverdue(transaction);
      
      if (transaction.isOverdue !== isOverdue) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.TRANSACTIONS,
          transaction.$id,
          {
            isOverdue: isOverdue
          }
        );
      }
    }
    
    console.log(`Updated overdue status for ${allTransactions.length} transactions`);
  } catch (error) {
    console.error('Error updating overdue status:', error);
  }
}
