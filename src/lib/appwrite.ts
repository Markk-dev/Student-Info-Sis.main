import { Client, Account, Databases, Storage } from 'appwrite';

// Appwrite configuration
// Use a relative endpoint during development so the dev server (or dev-tunnel) can proxy requests
// to the real Appwrite server and avoid CORS/third-party cookie issues. In production use the
// real Appwrite endpoint.
const devEndpoint = typeof window !== 'undefined' ? `${window.location.origin}/v1` : '/v1';
const prodEndpoint = 'https://syd.cloud.appwrite.io/v1';
// `import.meta.env` typing can cause TS errors in some configs; cast to any for simplicity here.
const endpoint = (import.meta as any).env.DEV ? devEndpoint : prodEndpoint;

const client = new Client()
  .setEndpoint(endpoint)
  .setProject('68a4b08c0015c7abf0ee');

// Initialize Appwrite services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Database and collection IDs
export const DATABASE_ID = '68a4b4d00029570a100a';
export const COLLECTIONS = {
  STUDENTS: 'students',
  ADMINS: 'admins',
  TRANSACTIONS: 'transactions',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  SETTINGS: 'settings',
  JOB_EXECUTIONS: 'job_executions'
} as const;

// Database schema types
export interface Student {
  $id?: string;
  studentId: string; // Format: "2201-000245" (YYYY-NNNNNN)
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  course: string;
  yearLevel: string;
  balance: number;
  cash: number; // Cash balance for the student
  loyalty: number; // Loyalty points - starts at 50 for new students
  isActive: boolean;
  suspensionDate?: string; // ISO date string for suspension end date
  createdAt?: string;
  updatedAt?: string;
}

export interface Admin {
  $id?: string;
  username: string;
  email: string;
  administrator_id: string; // Format: "2201-000245" (YYYY-NNNNNN)
  password: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  $id?: string;
  studentId: string;
  amount: number; // This will be totalItemAmount (what was bought)
  transactionAmount?: number; // Amount customer handed over
  itemPrices?: number[]; // Individual item prices
  totalItemAmount?: number; // Sum of item prices
  status?: 'Paid' | 'Partial' | 'Credit';
  items?: string[];
  cashierId: string;
  createdAt?: string;
}

export interface Product {
  $id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  stock?: number;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  $id?: string;
  studentId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  cashierId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Settings {
  $id?: string;
  canteenName: string;
  operatingHours: {
    open: string;
    close: string;
  };
  maxDailySpend: number;
  currency: string;
  taxRate: number;
  updatedAt?: string;
} 