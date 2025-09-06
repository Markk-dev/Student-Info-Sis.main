/**
 * Job Execution Log
 * Tracks when daily jobs are executed to prevent duplicates and provide audit trail
 */

import { databases, DATABASE_ID, COLLECTIONS } from './appwrite';
import { Query, ID } from 'appwrite';

export interface JobExecution {
  $id?: string;
  jobType: 'daily_payment_processing';
  executionDate: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  processedTransactions?: number;
  deductedTransactions?: number;
  errors?: string[];
  executedBy: 'system' | 'manual';
}

/**
 * Log the start of a job execution
 */
export async function logJobStart(jobType: 'daily_payment_processing', executedBy: 'system' | 'manual' = 'system'): Promise<string> {
  try {
    const now = new Date();
    const execution: Omit<JobExecution, '$id'> = {
      jobType,
      executionDate: now.toISOString().split('T')[0], // YYYY-MM-DD
      status: 'running',
      startTime: now.toISOString(),
      executedBy
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.JOB_EXECUTIONS,
      ID.unique(),
      execution
    );

    return response.$id;
  } catch (error) {
    console.error('Error logging job start:', error);
    throw error;
  }
}

/**
 * Log the completion of a job execution
 */
export async function logJobCompletion(
  executionId: string, 
  status: 'completed' | 'failed',
  processedTransactions: number = 0,
  deductedTransactions: number = 0,
  errors: string[] = []
): Promise<void> {
  try {
    const updateData: Partial<JobExecution> = {
      status,
      endTime: new Date().toISOString(),
      processedTransactions,
      deductedTransactions,
      errors: errors.length > 0 ? errors : undefined
    };

    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.JOB_EXECUTIONS,
      executionId,
      updateData
    );
  } catch (error) {
    console.error('Error logging job completion:', error);
    // Don't throw here to avoid breaking the main job
  }
}

/**
 * Check if a job has been executed today
 */
export async function hasJobRunToday(jobType: 'daily_payment_processing'): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.JOB_EXECUTIONS,
      [
        Query.equal('jobType', jobType),
        Query.equal('executionDate', today),
        Query.equal('status', 'completed')
      ]
    );

    return response.documents.length > 0;
  } catch (error) {
    console.error('Error checking if job has run today:', error);
    return false; // Assume not run if we can't check
  }
}

/**
 * Get the last successful job execution
 */
export async function getLastJobExecution(jobType: 'daily_payment_processing'): Promise<JobExecution | null> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.JOB_EXECUTIONS,
      [
        Query.equal('jobType', jobType),
        Query.equal('status', 'completed'),
        Query.orderDesc('executionDate'),
        Query.limit(1)
      ]
    );

    return response.documents.length > 0 ? response.documents[0] as unknown as JobExecution : null;
  } catch (error) {
    console.error('Error getting last job execution:', error);
    return null;
  }
}

/**
 * Get job execution history
 */
export async function getJobExecutionHistory(jobType: 'daily_payment_processing', limit: number = 10): Promise<JobExecution[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.JOB_EXECUTIONS,
      [
        Query.equal('jobType', jobType),
        Query.orderDesc('executionDate'),
        Query.limit(limit)
      ]
    );

    return response.documents as unknown as JobExecution[];
  } catch (error) {
    console.error('Error getting job execution history:', error);
    return [];
  }
}