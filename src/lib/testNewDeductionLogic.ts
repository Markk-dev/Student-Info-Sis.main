/**
 * Test the new deduction logic with proper grace period and phases
 */

import { calculateLoyaltyDeduction, getPaymentAlarmLevel } from './paymentTracking';

// Test function to verify the new deduction logic
export function testNewDeductionLogic() {
  console.log('=== Testing New Deduction Logic ===\n');

  const now = new Date();
  
  // Test 1: Within grace period (should be 0 deduction)
  const gracePeriodTransaction = {
    $id: 'test-1',
    dueDate: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    loyaltyDeductions: 0,
    lastDeductionDate: null
  };
  
  console.log('Test 1: Within grace period (12 hours overdue)');
  console.log('Due date:', gracePeriodTransaction.dueDate);
  console.log('Deduction amount:', calculateLoyaltyDeduction(gracePeriodTransaction));
  console.log('Alarm level:', getPaymentAlarmLevel(gracePeriodTransaction).level);
  console.log('---\n');

  // Test 2: 1 day overdue (after grace period) - should be 1 point
  const day1OverdueTransaction = {
    $id: 'test-2',
    dueDate: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
    loyaltyDeductions: 0,
    lastDeductionDate: null
  };
  
  console.log('Test 2: 1 day overdue (after grace period)');
  console.log('Due date:', day1OverdueTransaction.dueDate);
  console.log('Deduction amount:', calculateLoyaltyDeduction(day1OverdueTransaction));
  console.log('Alarm level:', getPaymentAlarmLevel(day1OverdueTransaction).level);
  console.log('---\n');

  // Test 3: 3 days overdue - should be 2 points
  const day3OverdueTransaction = {
    $id: 'test-3',
    dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    loyaltyDeductions: 0,
    lastDeductionDate: null
  };
  
  console.log('Test 3: 3 days overdue');
  console.log('Due date:', day3OverdueTransaction.dueDate);
  console.log('Deduction amount:', calculateLoyaltyDeduction(day3OverdueTransaction));
  console.log('Alarm level:', getPaymentAlarmLevel(day3OverdueTransaction).level);
  console.log('---\n');

  // Test 4: 5 days overdue - should be 4 points
  const day5OverdueTransaction = {
    $id: 'test-4',
    dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    loyaltyDeductions: 0,
    lastDeductionDate: null
  };
  
  console.log('Test 4: 5 days overdue');
  console.log('Due date:', day5OverdueTransaction.dueDate);
  console.log('Deduction amount:', calculateLoyaltyDeduction(day5OverdueTransaction));
  console.log('Alarm level:', getPaymentAlarmLevel(day5OverdueTransaction).level);
  console.log('---\n');

  // Test 5: 7 days overdue - should be 4 points (max)
  const day7OverdueTransaction = {
    $id: 'test-5',
    dueDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    loyaltyDeductions: 0,
    lastDeductionDate: null
  };
  
  console.log('Test 5: 7 days overdue');
  console.log('Due date:', day7OverdueTransaction.dueDate);
  console.log('Deduction amount:', calculateLoyaltyDeduction(day7OverdueTransaction));
  console.log('Alarm level:', getPaymentAlarmLevel(day7OverdueTransaction).level);
  console.log('---\n');

  console.log('=== Test Complete ===');
  console.log('Expected Results:');
  console.log('- Grace period (24h): 0 points');
  console.log('- 1 day overdue: 1 point');
  console.log('- 2-4 days overdue: 2 points');
  console.log('- 5+ days overdue: 4 points');
}

// Export for use in console
if (typeof window !== 'undefined') {
  (window as any).testNewDeductionLogic = testNewDeductionLogic;
}
