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
  
  // Add 12-hour grace period
  const gracePeriod = new Date(dueDate.getTime() + 12 * 60 * 60 * 1000);
  
  return now > gracePeriod;
}

/**
 * Calculate loyalty points to deduct for overdue transaction
 */
export function calculateLoyaltyDeduction(transaction: any): number {
  if (!isTransactionOverdue(transaction)) return 0;
  
  const dueDate = new Date(transaction.dueDate);
  const now = new Date();
  const gracePeriod = new Date(dueDate.getTime() + 12 * 60 * 60 * 1000);
  
  // If still in grace period, no deduction
  if (now <= gracePeriod) return 0;
  
  const daysOverdue = Math.floor((now.getTime() - gracePeriod.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysOverdue === 0) {
    return LOYALTY_DEDUCTIONS.INITIAL;
  } else {
    return LOYALTY_DEDUCTIONS.ESCALATED;
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
 * Get all overdue transactions for a student
 */
export async function getOverdueTransactions(studentId: string): Promise<any[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      [
        Query.equal('studentId', studentId),
        Query.equal('status', 'Partial'),
        Query.equal('isOverdue', true)
      ]
    );
    
    return response.documents;
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
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      [
        Query.equal('status', 'Partial'),
        Query.equal('isOverdue', true)
      ]
    );
    
    return response.documents;
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
export async function processDailyLoyaltyDeductions(): Promise<void> {
  try {
    console.log('Starting daily loyalty deduction process...');
    
    // Get all overdue transactions
    const overdueTransactions = await getAllOverdueTransactions();
    
    for (const transaction of overdueTransactions) {
      try {
        const deductionAmount = calculateLoyaltyDeduction(transaction);
        
        if (deductionAmount > 0) {
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
              await suspendStudentAccount(transaction.studentId, 'Loyalty points below threshold');
            }
          }
        }
      } catch (error) {
        console.error(`Error processing transaction ${transaction.$id}:`, error);
        // Continue with other transactions
      }
    }
    
    console.log(`Processed ${overdueTransactions.length} overdue transactions`);
  } catch (error) {
    console.error('Error in daily loyalty deduction process:', error);
  }
}

/**
 * Check and update overdue status for all transactions
 */
export async function updateOverdueStatus(): Promise<void> {
  try {
    console.log('Updating overdue status for all transactions...');
    
    // Get all partial and credit transactions
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      [
        Query.equal('status', 'Partial')
      ]
    );
    
    for (const transaction of response.documents) {
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
    
    console.log(`Updated overdue status for ${response.documents.length} transactions`);
  } catch (error) {
    console.error('Error updating overdue status:', error);
  }
}
