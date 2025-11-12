import { account, databases, DATABASE_ID, COLLECTIONS } from './appwrite';
import { ID, Query } from 'appwrite';
import type { Student, Admin, Transaction, Product, Order, Settings } from './appwrite';
import { calculateDueDate, updateTransactionDueDate, isTransactionOverdue } from './paymentTracking';

// Authentication Services
export const authService = {
  // Student Registration
  async registerStudent(studentData: {
    studentId: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    course: string;
    yearLevel: string;
  }) {
    try {
      // Check if student already exists
      const existingStudents = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.STUDENTS,
        [Query.equal('email', studentData.email)]
      );

      if (existingStudents.documents.length > 0) {
        throw new Error('A student with this email already exists');
      }

      // Check if student ID already exists
      const existingStudentId = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.STUDENTS,
        [Query.equal('studentId', studentData.studentId)]
      );

      if (existingStudentId.documents.length > 0) {
        throw new Error('A student with this Student ID already exists');
      }

      // Create student document in database only (no Appwrite auth)
      const student = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.STUDENTS,
        ID.unique(),
        {
          studentId: studentData.studentId,
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          email: studentData.email,
          password: studentData.password,
          course: studentData.course,
          yearLevel: studentData.yearLevel,
          balance: 0,
          cash: 0,
          loyalty: 25, // Automatic 25 loyalty points for new students
          isActive: true
        }
      );

      return { student };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  // Student Login
  async loginStudent(studentId: string, password: string) {
    try {
      // Get student data from database by studentId
      const students = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.STUDENTS,
        [Query.equal('studentId', studentId)]
      );

      if (students.documents.length === 0) {
        throw new Error('Student not found');
      }

      const student = students.documents[0] as unknown as Student;

      // Check password
      if (student.password !== password) {
        throw new Error('Invalid password');
      }

      // Check if student is active
      if (!student.isActive) {
        throw new Error('Account is suspended');
      }

      return {
        user: student,
        student: student
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Admin Login
  async loginAdmin(administratorId: string, password: string) {
    try {
      // Get admin data from database by administrator_id
      const admins = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.ADMINS,
        [Query.equal('administrator_id', administratorId)]
      );

      if (admins.documents.length === 0) {
        throw new Error('Admin not found');
      }

      const admin = admins.documents[0] as unknown as Admin;

      // Check password
      if (admin.password !== password) {
        throw new Error('Invalid password');
      }

      // Check if admin is active
      if (!admin.isActive) {
        throw new Error('Account is suspended');
      }

      return {
        user: admin,
        admin: admin
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Logout
  async logout() {
    try {
      // Since we're not using Appwrite auth sessions, just return success
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      // Since we're not using Appwrite auth, return null
      // The current user will be managed by React state instead
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }
};

// Student Services
export const studentService = {
  async getStudents() {
    try {
      return await databases.listDocuments(DATABASE_ID, COLLECTIONS.STUDENTS);
    } catch (error) {
      console.error('Get students error:', error);
      throw error;
    }
  },

  async getStudent(studentId: string) {
    try {
      return await databases.getDocument(DATABASE_ID, COLLECTIONS.STUDENTS, studentId);
    } catch (error) {
      console.error('Get student error:', error);
      throw error;
    }
  },

  async getStudentById(studentId: string) {
    try {
      const students = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.STUDENTS,
        [Query.equal('studentId', studentId)]
      );

      if (students.documents.length > 0) {
        const student = students.documents[0] as unknown as Student;
        return {
          id: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          course: student.course,
          yearLevel: student.yearLevel,
          isRegistered: true
        };
      }
      return null;
    } catch (error) {
      console.error('Get student by ID error:', error);
      throw error;
    }
  },

  async createStudent(data: {
    id: string;
    name: string;
    course: string;
    yearLevel: string;
    isRegistered: boolean;
    email?: string;
  }) {
    try {
      // Check if student ID already exists
      const existingStudentId = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.STUDENTS,
        [Query.equal('studentId', data.id)]
      );

      if (existingStudentId.documents.length > 0) {
        throw new Error('A student with this Student ID already exists');
      }

      const [firstName, ...lastNameParts] = data.name.split(' ');
      const lastName = lastNameParts.join(' ') || 'Unknown';

      const providedEmail = data.email?.trim();

      const studentData = {
        studentId: data.id,
        firstName: firstName,
        lastName: lastName,
        email: providedEmail && providedEmail.length > 0 ? providedEmail : `${data.id}@quickregister.local`,
        password: 'default123', // Default password
        course: data.course,
        yearLevel: data.yearLevel,
        balance: 0,
        cash: 0,
        loyalty: 25, // Automatic 25 loyalty points for new students
        isActive: true
      };

      console.log('Creating student with data:', studentData); // Debug log

      const createdStudent = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.STUDENTS,
        ID.unique(),
        studentData
      );

      console.log('Student created successfully:', createdStudent); // Debug log

      return {
        id: createdStudent.studentId,
        firstName: firstName,
        lastName: lastName,
        course: data.course,
        yearLevel: data.yearLevel,
        isRegistered: true
      };
    } catch (error) {
      console.error('Create student error:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error)); // More detailed error logging
      throw error;
    }
  },

  async updateStudent(studentId: string, data: Partial<Student>) {
    try {
      // First, find the student by studentId to get the Appwrite document $id
      const students = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.STUDENTS,
        [Query.equal('studentId', studentId)]
      );

      if (students.documents.length === 0) {
        throw new Error('Student not found');
      }

      const student = students.documents[0];

      // Now update using the Appwrite document $id
      return await databases.updateDocument(DATABASE_ID, COLLECTIONS.STUDENTS, student.$id, data);
    } catch (error) {
      console.error('Update student error:', error);
      throw error;
    }
  },

  async deleteStudent(studentId: string) {
    try {
      return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.STUDENTS, studentId);
    } catch (error) {
      console.error('Delete student error:', error);
      throw error;
    }
  },

  // Check and update suspension status for all students
  async checkSuspensionStatus() {
    try {
      const students = await this.getStudents();
      const now = new Date();

      for (const student of students.documents) {
        if (student.suspensionDate && student.isActive === false) {
          const suspensionEnd = new Date(student.suspensionDate);

          // If suspension period has ended, reactivate the student
          if (now > suspensionEnd) {
            await this.updateStudent(student.studentId, {
              isActive: true,
              suspensionDate: undefined
            });
            console.log(`Student ${student.studentId} suspension ended, account reactivated`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking suspension status:', error);
    }
  }
};

// Admin Services
export const adminService = {
  async getAdmins() {
    try {
      return await databases.listDocuments(DATABASE_ID, COLLECTIONS.ADMINS);
    } catch (error) {
      console.error('Get admins error:', error);
      throw error;
    }
  },

  async getAdmin(adminId: string) {
    try {
      return await databases.getDocument(DATABASE_ID, COLLECTIONS.ADMINS, adminId);
    } catch (error) {
      console.error('Get admin error:', error);
      throw error;
    }
  },

  async createAdmin(data: Omit<Admin, '$id' | 'createdAt' | 'updatedAt'>) {
    try {
      return await databases.createDocument(DATABASE_ID, COLLECTIONS.ADMINS, ID.unique(), data);
    } catch (error) {
      console.error('Create admin error:', error);
      throw error;
    }
  },

  async updateAdmin(adminId: string, data: Partial<Admin>) {
    try {
      return await databases.updateDocument(DATABASE_ID, COLLECTIONS.ADMINS, adminId, data);
    } catch (error) {
      console.error('Update admin error:', error);
      throw error;
    }
  },

  async deleteAdmin(adminId: string) {
    try {
      return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.ADMINS, adminId);
    } catch (error) {
      console.error('Delete admin error:', error);
      throw error;
    }
  }
};

// Transaction Services
export const transactionService = {
  async getTransactions() {
    try {
      return await databases.listDocuments(DATABASE_ID, COLLECTIONS.TRANSACTIONS);
    } catch (error) {
      console.error('Get transactions error:', error);
      throw error;
    }
  },

  async createTransaction(data: any) {
    try {
      return await databases.createDocument(DATABASE_ID, COLLECTIONS.TRANSACTIONS, ID.unique(), data);
    } catch (error) {
      console.error('Create transaction error:', error);
      throw error;
    }
  },

  async updateTransaction(transactionId: string, data: Partial<Transaction>) {
    try {
      return await databases.updateDocument(DATABASE_ID, COLLECTIONS.TRANSACTIONS, transactionId, data);
    } catch (error) {
      console.error('Update transaction error:', error);
      throw error;
    }
  },

  async deleteTransaction(transactionId: string) {
    try {
      return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TRANSACTIONS, transactionId);
    } catch (error) {
      console.error('Delete transaction error:', error);
      throw error;
    }
  },

  // Payment tracking functions
  async createTransactionWithDueDate(data: any) {
    try {
      const transaction = await this.createTransaction(data);
      
      // Calculate and set due date for partial and credit transactions
      if (data.status === 'Partial' || data.status === 'Credit') {
        const dueDate = calculateDueDate(new Date(), data.totalItemAmount);
        const isOverdue = isTransactionOverdue({
          dueDate: dueDate.toISOString(),
          status: data.status
        });
        
        await updateTransactionDueDate(transaction.$id, dueDate, isOverdue);
      }
      
      return transaction;
    } catch (error) {
      console.error('Create transaction with due date error:', error);
      throw error;
    }
  },

  async getOverdueTransactions() {
    try {
      return await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.TRANSACTIONS,
        [Query.equal('isOverdue', true)]
      );
    } catch (error) {
      console.error('Get overdue transactions error:', error);
      throw error;
    }
  },

  async getStudentOverdueTransactions(studentId: string) {
    try {
      return await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.TRANSACTIONS,
        [
          Query.equal('studentId', studentId),
          Query.equal('isOverdue', true)
        ]
      );
    } catch (error) {
      console.error('Get student overdue transactions error:', error);
      throw error;
    }
  }
};

// Product Services
export const productService = {
  async getProducts() {
    try {
      return await databases.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS);
    } catch (error) {
      console.error('Get products error:', error);
      throw error;
    }
  },

  async createProduct(data: Omit<Product, '$id' | 'createdAt' | 'updatedAt'>) {
    try {
      return await databases.createDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, ID.unique(), data);
    } catch (error) {
      console.error('Create product error:', error);
      throw error;
    }
  },

  async updateProduct(productId: string, data: Partial<Product>) {
    try {
      return await databases.updateDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, productId, data);
    } catch (error) {
      console.error('Update product error:', error);
      throw error;
    }
  }
};

// Order Services
export const orderService = {
  async getOrders() {
    try {
      return await databases.listDocuments(DATABASE_ID, COLLECTIONS.ORDERS);
    } catch (error) {
      console.error('Get orders error:', error);
      throw error;
    }
  },

  async createOrder(data: Omit<Order, '$id' | 'createdAt' | 'updatedAt'>) {
    try {
      return await databases.createDocument(DATABASE_ID, COLLECTIONS.ORDERS, ID.unique(), data);
    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
  },

  async updateOrder(orderId: string, data: Partial<Order>) {
    try {
      return await databases.updateDocument(DATABASE_ID, COLLECTIONS.ORDERS, orderId, data);
    } catch (error) {
      console.error('Update order error:', error);
      throw error;
    }
  }
};

// Settings Services
export const settingsService = {
  async getSettings() {
    try {
      const settings = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SETTINGS);
      if (settings.documents.length > 0) {
        return settings.documents[0] as unknown as Settings;
      }
      // Return default settings if none exist
      return {
        canteenName: 'Canteen Management',
        operatingHours: { open: '7:00 AM', close: '8:00 PM' },
        maxDailySpend: 1000,
        currency: 'PHP',
        taxRate: 0.12
      } as Settings;
    } catch (error) {
      console.error('Get settings error:', error);
      // Return default settings on error
      return {
        canteenName: 'Canteen Management',
        operatingHours: { open: '7:00 AM', close: '8:00 PM' },
        maxDailySpend: 1000,
        currency: 'PHP',
        taxRate: 0.12
      } as Settings;
    }
  },

  async updateSettings(data: Partial<Settings>) {
    try {
      const settings = await this.getSettings();

      if (settings.$id) {
        // Update existing settings
        return await databases.updateDocument(DATABASE_ID, COLLECTIONS.SETTINGS, settings.$id, data);
      } else {
        // Create new settings document
        return await databases.createDocument(DATABASE_ID, COLLECTIONS.SETTINGS, ID.unique(), {
          canteenName: 'Canteen Management',
          operatingHours: { open: '7:00 AM', close: '8:00 PM' },
          maxDailySpend: 1000,
          currency: 'PHP',
          taxRate: 0.12,
          ...data
        });
      }
    } catch (error) {
      console.error('Update settings error:', error);
      throw error;
    }
  },

  async isSystemInMaintenance() {
    try {
      const settings = await this.getSettings();
      // Temporary workaround: use maxDailySpend as maintenance flag
      // 0 = maintenance mode, > 0 = normal mode
      return settings?.maxDailySpend === 0;
    } catch (error) {
      console.error('Check maintenance status error:', error);
      return false; // Default to not in maintenance if error
    }
  }
}; 