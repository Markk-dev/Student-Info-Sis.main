import bcrypt from 'bcryptjs';
import { databases, DATABASE_ID, COLLECTIONS } from './appwrite';

/**
 * Migration script to hash existing plaintext passwords
 * This should be run once to convert all existing passwords to hashed versions
 */
export async function migratePasswordsToHash() {
  console.log('Starting password migration...');
  
  try {
    // Migrate student passwords
    const students = await databases.listDocuments(DATABASE_ID, COLLECTIONS.STUDENTS);
    console.log(`Found ${students.documents.length} students to migrate`);
    
    for (const student of students.documents) {
      // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
      if (!student.password.startsWith('$2')) {
        console.log(`Migrating password for student: ${student.studentId}`);
        
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(student.password, saltRounds);
        
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.STUDENTS,
          student.$id,
          { password: hashedPassword }
        );
        
        console.log(`✓ Migrated password for student: ${student.studentId}`);
      } else {
        console.log(`- Password already hashed for student: ${student.studentId}`);
      }
    }
    
    // Migrate admin passwords
    const admins = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ADMINS);
    console.log(`Found ${admins.documents.length} admins to migrate`);
    
    for (const admin of admins.documents) {
      // Check if password is already hashed
      if (!admin.password.startsWith('$2')) {
        console.log(`Migrating password for admin: ${admin.administrator_id}`);
        
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(admin.password, saltRounds);
        
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.ADMINS,
          admin.$id,
          { password: hashedPassword }
        );
        
        console.log(`✓ Migrated password for admin: ${admin.administrator_id}`);
      } else {
        console.log(`- Password already hashed for admin: ${admin.administrator_id}`);
      }
    }
    
    console.log('Password migration completed successfully!');
    return { success: true, message: 'All passwords have been migrated to hashed versions' };
    
  } catch (error) {
    console.error('Password migration failed:', error);
    throw error;
  }
}

/**
 * Utility function to check if a password is already hashed
 */
export function isPasswordHashed(password: string): boolean {
  return password.startsWith('$2');
}

/**
 * Utility function to hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Utility function to verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}