import { databases, DATABASE_ID, COLLECTIONS } from './appwrite';
import { Query } from 'appwrite';

/**
 * Lift suspension for a student account
 */
export async function liftStudentSuspension(studentId: string, reason: string = 'Payment completed'): Promise<void> {
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
        isActive: true,
        suspensionDate: null
      }
    );
    
    console.log(`Lifted suspension for student account ${studentId}. Reason: ${reason}`);
  } catch (error) {
    console.error('Error lifting student suspension:', error);
    throw error;
  }
}

/**
 * Process payment for an overdue transaction
 */
export async function processOverduePayment(transactionId: string, paymentAmount: number): Promise<void> {
  try {
    // Get the transaction
    const transaction = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      transactionId
    );
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    const remainingBalance = Math.abs(transaction.amount);
    
    if (paymentAmount > remainingBalance) {
      throw new Error('Payment amount exceeds remaining balance');
    }
    
    // Calculate new transaction amount and status
    const currentTransactionAmount = transaction.transactionAmount || 0;
    const newTransactionAmount = currentTransactionAmount + paymentAmount;
    const newAmount = remainingBalance - paymentAmount;
    
    let newStatus: string;
    if (newAmount <= 0) {
      // Fully paid
      newStatus = 'Paid';
    } else {
      // Still partial
      newStatus = 'Partial';
    }
    
    // Update the transaction
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      transactionId,
      {
        transactionAmount: newTransactionAmount,
        amount: newAmount <= 0 ? transaction.totalItemAmount : -newAmount,
        status: newStatus,
        isOverdue: false, // No longer overdue
        dueDate: null // Clear due date
      }
    );
    
    // If fully paid, check if student should have suspension lifted
    if (newStatus === 'Paid') {
      const studentsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.STUDENTS,
        [Query.equal('studentId', transaction.studentId)]
      );
      
      if (studentsResponse.documents.length > 0) {
        const student = studentsResponse.documents[0];
        
        // Check if student has any remaining overdue transactions
        const remainingOverdue = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.TRANSACTIONS,
          [
            Query.equal('studentId', transaction.studentId),
            Query.equal('status', 'Partial'),
            Query.equal('isOverdue', true)
          ]
        );
        
        // If no remaining overdue transactions and loyalty points are above threshold, lift suspension
        if (remainingOverdue.documents.length === 0 && (student.loyalty || 0) > 20) {
          await liftStudentSuspension(transaction.studentId, 'All overdue payments completed');
        }
      }
    }
    
    console.log(`Processed payment of ₱${paymentAmount} for transaction ${transactionId}`);
  } catch (error) {
    console.error('Error processing overdue payment:', error);
    throw error;
  }
}

/**
 * Get student's payment history and status
 */
export async function getStudentPaymentStatus(studentId: string): Promise<{
  student: any;
  overdueTransactions: any[];
  totalOverdue: number;
  canMakeNewTransactions: boolean;
  suspensionReason?: string;
}> {
  try {
    // Get student data
    const studentsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.STUDENTS,
      [Query.equal('studentId', studentId)]
    );
    
    if (studentsResponse.documents.length === 0) {
      throw new Error('Student not found');
    }
    
    const student = studentsResponse.documents[0];
    
    // Get overdue transactions
    const overdueTransactions = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      [
        Query.equal('studentId', studentId),
        Query.equal('status', 'Partial'),
        Query.equal('isOverdue', true)
      ]
    );
    
    const totalOverdue = overdueTransactions.documents.reduce((sum, txn) => {
      return sum + Math.abs(txn.amount);
    }, 0);
    
    const canMakeNewTransactions = student.isActive && (student.loyalty || 0) > 20;
    
    let suspensionReason: string | undefined;
    if (!student.isActive) {
      if ((student.loyalty || 0) <= 0) {
        suspensionReason = 'Account banned due to zero loyalty points';
      } else if ((student.loyalty || 0) <= 20) {
        suspensionReason = 'Account suspended due to low loyalty points';
      } else {
        suspensionReason = 'Account suspended for other reasons';
      }
    }
    
    return {
      student,
      overdueTransactions: overdueTransactions.documents,
      totalOverdue,
      canMakeNewTransactions,
      suspensionReason
    };
  } catch (error) {
    console.error('Error getting student payment status:', error);
    throw error;
  }
}

/**
 * Restore loyalty points for a student (admin function)
 */
export async function restoreLoyaltyPoints(studentId: string, points: number, reason: string): Promise<void> {
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
    const currentLoyalty = student.loyalty || 0;
    const newLoyalty = Math.min(100, currentLoyalty + points); // Cap at 100
    
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.STUDENTS,
      student.$id,
      {
        loyalty: newLoyalty
      }
    );
    
    console.log(`Restored ${points} loyalty points to student ${studentId}. Reason: ${reason}. New total: ${newLoyalty}`);
  } catch (error) {
    console.error('Error restoring loyalty points:', error);
    throw error;
  }
}

/**
 * Get payment recovery statistics
 */
export async function getPaymentRecoveryStats(): Promise<{
  totalOverdueTransactions: number;
  totalOverdueAmount: number;
  suspendedAccounts: number;
  bannedAccounts: number;
  recentRecoveries: number;
}> {
  try {
    // Get all overdue transactions
    const overdueTransactions = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      [Query.equal('isOverdue', true)]
    );
    
    const totalOverdueAmount = overdueTransactions.documents.reduce((sum, txn) => {
      return sum + Math.abs(txn.amount);
    }, 0);
    
    // Get suspended accounts
    const suspendedStudents = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.STUDENTS,
      [Query.equal('isActive', false)]
    );
    
    const suspendedAccounts = suspendedStudents.documents.length;
    const bannedAccounts = suspendedStudents.documents.filter(s => (s.loyalty || 0) <= 0).length;
    
    // Get recent recoveries (transactions that were overdue but are now paid)
    const recentRecoveries = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      [
        Query.equal('status', 'Paid'),
        Query.greaterThan('$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]
    );
    
    return {
      totalOverdueTransactions: overdueTransactions.documents.length,
      totalOverdueAmount,
      suspendedAccounts,
      bannedAccounts,
      recentRecoveries: recentRecoveries.documents.length
    };
  } catch (error) {
    console.error('Error getting payment recovery stats:', error);
    throw error;
  }
}
