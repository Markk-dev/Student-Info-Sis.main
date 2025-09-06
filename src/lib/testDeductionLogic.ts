/**
 * Test file to verify loyalty deduction logic
 * Run this to test if the deduction system is working correctly
 */

import { 
  calculateLoyaltyDeduction, 
  isTransactionOverdue, 
  getDeductionSummary,
  hasBeenProcessedToday 
} from './paymentTracking';

// Mock transaction data for testing
const createMockTransaction = (overrides: any = {}) => ({
  $id: 'test-transaction-1',
  studentId: 'student-123',
  amount: -100,
  status: 'Partial',
  dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  isOverdue: true,
  loyaltyDeductions: 0,
  lastDeductionDate: null,
  ...overrides
});

export function testDeductionLogic() {
  console.log('=== Testing Loyalty Deduction Logic ===\n');

  // Test 1: New overdue transaction (should deduct 1 point)
  const newOverdueTransaction = createMockTransaction();
  console.log('Test 1: New overdue transaction');
  console.log('Transaction:', {
    dueDate: newOverdueTransaction.dueDate,
    lastDeductionDate: newOverdueTransaction.lastDeductionDate,
    loyaltyDeductions: newOverdueTransaction.loyaltyDeductions
  });
  console.log('Is overdue:', isTransactionOverdue(newOverdueTransaction));
  console.log('Deduction amount:', calculateLoyaltyDeduction(newOverdueTransaction));
  console.log('Summary:', getDeductionSummary(newOverdueTransaction));
  console.log('---\n');

  // Test 2: Transaction already processed today (should deduct 0)
  const processedTodayTransaction = createMockTransaction({
    lastDeductionDate: new Date().toISOString(),
    loyaltyDeductions: 1
  });
  console.log('Test 2: Transaction already processed today');
  console.log('Transaction:', {
    dueDate: processedTodayTransaction.dueDate,
    lastDeductionDate: processedTodayTransaction.lastDeductionDate,
    loyaltyDeductions: processedTodayTransaction.loyaltyDeductions
  });
  console.log('Has been processed today:', hasBeenProcessedToday(processedTodayTransaction));
  console.log('Deduction amount:', calculateLoyaltyDeduction(processedTodayTransaction));
  console.log('Summary:', getDeductionSummary(processedTodayTransaction));
  console.log('---\n');

  // Test 3: Transaction processed yesterday (should deduct 4 points)
  const processedYesterdayTransaction = createMockTransaction({
    lastDeductionDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    loyaltyDeductions: 1
  });
  console.log('Test 3: Transaction processed yesterday');
  console.log('Transaction:', {
    dueDate: processedYesterdayTransaction.dueDate,
    lastDeductionDate: processedYesterdayTransaction.lastDeductionDate,
    loyaltyDeductions: processedYesterdayTransaction.loyaltyDeductions
  });
  console.log('Has been processed today:', hasBeenProcessedToday(processedYesterdayTransaction));
  console.log('Deduction amount:', calculateLoyaltyDeduction(processedYesterdayTransaction));
  console.log('Summary:', getDeductionSummary(processedYesterdayTransaction));
  console.log('---\n');

  // Test 4: Transaction within grace period (should deduct 0)
  const gracePeriodTransaction = createMockTransaction({
    dueDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago (within 12h grace)
    isOverdue: false
  });
  console.log('Test 4: Transaction within grace period');
  console.log('Transaction:', {
    dueDate: gracePeriodTransaction.dueDate,
    lastDeductionDate: gracePeriodTransaction.lastDeductionDate,
    loyaltyDeductions: gracePeriodTransaction.loyaltyDeductions
  });
  console.log('Is overdue:', isTransactionOverdue(gracePeriodTransaction));
  console.log('Deduction amount:', calculateLoyaltyDeduction(gracePeriodTransaction));
  console.log('Summary:', getDeductionSummary(gracePeriodTransaction));
  console.log('---\n');

  console.log('=== Test Complete ===');
}

// Export for use in console or other files
if (typeof window !== 'undefined') {
  (window as any).testDeductionLogic = testDeductionLogic;
}