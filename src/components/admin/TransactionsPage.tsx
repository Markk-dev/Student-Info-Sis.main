import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Plus, Search, Filter, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { transactionService, studentService } from '@/lib/services';
import { format as formatDateFns } from 'date-fns';
import { BarcodeScanner } from './BarcodeScanner';
import { DottedSeparator } from '../ui/dotted-line';

// const COLORS = ['#14a800', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];

interface Transaction {
  id: string;
  studentId: string;
  studentName: string;
  course: string;
  amount: number; // This will now be the item prices total
  transactionAmount?: number; // Amount customer handed over
  itemPrices?: string; // Individual item prices stored as JSON string
  totalItemAmount?: number; // Total of item prices
  timestamp: Date;
  cashier: string;
  status: 'Paid' | 'Partial' | 'Credit' | 'completed' | 'pending' | 'refunded';
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const transactionsResponse = await transactionService.getTransactions();
        
        const studentsResponse = await studentService.getStudents();
        
        
        const studentsMap = new Map();
        studentsResponse.documents.forEach((student: any) => {
          studentsMap.set(student.studentId, student);
        });
        
        
        const transformedTransactions: Transaction[] = transactionsResponse.documents.map((txn: any) => {
          const student = studentsMap.get(txn.studentId);
          
          
          let timestamp: Date;
          try {
            // Appwrite stores timestamps in ISO format, parse directly
            timestamp = new Date(txn.$createdAt || txn.createdAt);
            if (isNaN(timestamp.getTime())) {
              console.warn('Invalid timestamp for transaction:', txn.$id, txn.$createdAt);
              timestamp = new Date(); 
            } else {
              // Debug log for successful timestamp parsing
              console.log(`Successfully parsed timestamp for ${txn.$id}:`, {
                raw: txn.$createdAt || txn.createdAt,
                parsed: timestamp.toISOString(),
                local: timestamp.toString()
              });
            }
          } catch (error) {
            console.warn('Error parsing timestamp for transaction:', txn.$id, error);
            timestamp = new Date(); 
          }
          
          return {
            id: txn.$id,
            studentId: txn.studentId,
            studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
            course: student ? student.course : 'Unknown',
            amount: txn.amount,
            transactionAmount: txn.transactionAmount,
            itemPrices: txn.itemPrices,
            totalItemAmount: txn.totalItemAmount,
            timestamp: timestamp,
            cashier: txn.cashierId || 'Admin',
            status: txn.status || 'completed',
          };
        });
        
        // Sort by latest first (newest transactions at the top), then by ID as fallback
        const sortedTransactions = transformedTransactions.sort((a, b) => {
          const timeDiff = b.timestamp.getTime() - a.timestamp.getTime();
          if (timeDiff !== 0) return timeDiff;
          // If timestamps are the same, sort by ID (newer IDs come first)
          return b.id.localeCompare(a.id);
        });
        
        setTransactions(sortedTransactions);
      } catch (error) {
        toast.error('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, []);

  
  const courses = useMemo(() => {
    const uniqueCourses = [...new Set(transactions.map(t => t.course))];
    return uniqueCourses.sort();
  }, [transactions]);

  
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = 
        transaction.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCourse = courseFilter === 'all' || transaction.course === courseFilter;
      const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
      
      const matchesDateRange = !dateRange.from || !dateRange.to || 
        (transaction.timestamp && !isNaN(transaction.timestamp.getTime()) &&
         dateRange.from && !isNaN(dateRange.from.getTime()) &&
         dateRange.to && !isNaN(dateRange.to.getTime()) &&
         transaction.timestamp >= dateRange.from && transaction.timestamp <= dateRange.to);

      return matchesSearch && matchesCourse && matchesStatus && matchesDateRange;
    });
  }, [transactions, searchTerm, courseFilter, statusFilter, dateRange]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, courseFilter, statusFilter, dateRange]);

  const getStatusBadge = (status: Transaction['status']) => {
    const config = {
      Paid: { variant: 'default' as const, className: 'inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 border border-green-200 rounded-full' },
      Partial: { variant: 'secondary' as const, className: 'inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-200 text-yellow-900 border border-yellow-300 rounded-full' },
      Credit: { variant: 'outline' as const, className: 'inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 rounded-full' },
      completed: { variant: 'default' as const, className: 'inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 border border-green-200 rounded-full' },
      pending: { variant: 'secondary' as const, className: 'inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-full' },
      refunded: { variant: 'destructive' as const, className: 'inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 border border-red-200 rounded-full' }
    };

    const { variant, className } = config[status] || config.completed;

    return (
      <Badge variant={variant} className={className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    // Use the date directly - formatDateFns handles timezone conversion
    return formatDateFns(date, 'MMM dd, yyyy');
  };

  const formatTime = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return 'Invalid Time';
    }
    // Use the date directly - formatDateFns handles timezone conversion
    return formatDateFns(date, 'HH:mm');
  };

  // Debug function to log timestamp information (uncomment for debugging)
  // const debugTimestamp = (date: Date, transactionId: string) => {
  //   console.log(`Transaction ${transactionId}:`, {
  //     originalDate: date,
  //     isoString: date.toISOString(),
  //     localString: date.toString(),
  //     timezoneOffset: date.getTimezoneOffset(),
  //     formattedDate: formatDate(date),
  //     formattedTime: formatTime(date)
  //   });
  // };

  const exportCSV = () => {
    
    const headers = ['Transaction Number', 'Student ID', 'Student Name', 'Course', 'Amount', 'Date & Time', 'Cashier', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t => [
        t.id,
        t.studentId,
        `"${t.studentName}"`,
        `"${t.course}"`,
        t.amount.toFixed(2),
        // Combine date and time without year and quote to avoid comma issues
        `"${formatDateFns(t.timestamp, 'MMM d')}_${formatDateFns(t.timestamp, 'HH:mm')}"`,
        `"${t.cashier}"`,
        t.status
      ].join(','))
    ].join('\n');

    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${formatDateFns(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully');
  };

  const handleNewTransaction = async (transactionData: any) => {
    try {
      
      // Calculate amount based on transaction status
      let amount: number;
      if (transactionData.status === 'Credit') {
        // For credit transactions, amount should be negative (debt)
        amount = -transactionData.totalItemAmount;
      } else if (transactionData.status === 'Partial') {
        // For partial transactions, record the remaining balance (negative)
        amount = transactionData.transactionAmount - transactionData.totalItemAmount;
      } else {
        // For paid transactions, record the total item amount
        amount = transactionData.totalItemAmount;
      }

      await transactionService.createTransaction({
        studentId: transactionData.studentId,
        amount: amount, // Calculated based on status
        transactionAmount: transactionData.transactionAmount, // Amount customer handed over
        totalItemAmount: transactionData.totalItemAmount, // Always positive - actual item value
        itemPrices: JSON.stringify(transactionData.itemPrices || []), // Store as JSON string
        status: transactionData.status, // Paid/Partial/Credit
        cashierId: 'admin_002', 
      });

      
      const transactionsResponse = await transactionService.getTransactions();
      const studentsResponse = await studentService.getStudents();
      
      
      const studentsMap = new Map();
      studentsResponse.documents.forEach((student: any) => {
        studentsMap.set(student.studentId, student);
      });
      
      
      const transformedTransactions: Transaction[] = transactionsResponse.documents.map((txn: any) => {
        const student = studentsMap.get(txn.studentId);
        
        
        let timestamp: Date;
        try {
          // Appwrite stores timestamps in ISO format, parse directly
          timestamp = new Date(txn.$createdAt || txn.createdAt);
          if (isNaN(timestamp.getTime())) {
            console.warn('Invalid timestamp for transaction:', txn.$id, txn.$createdAt);
            timestamp = new Date(); 
          }
        } catch (error) {
          console.warn('Error parsing timestamp for transaction:', txn.$id, error);
          timestamp = new Date(); 
        }
        
        return {
          id: txn.$id,
          studentId: txn.studentId,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
          course: student ? student.course : 'Unknown',
          amount: txn.amount,
          transactionAmount: txn.transactionAmount,
          itemPrices: txn.itemPrices,
          totalItemAmount: txn.totalItemAmount,
          timestamp: timestamp,
          cashier: txn.cashierId || 'Admin',
          status: txn.status || 'completed',
        };
      });
      
      // Sort by latest first (newest transactions at the top), then by ID as fallback
      const sortedTransactions = transformedTransactions.sort((a, b) => {
        const timeDiff = b.timestamp.getTime() - a.timestamp.getTime();
        if (timeDiff !== 0) return timeDiff;
        // If timestamps are the same, sort by ID (newer IDs come first)
        return b.id.localeCompare(a.id);
      });
      
      setTransactions(sortedTransactions);
      setShowBarcodeScanner(false);
      
      // Show appropriate success message
      if (transactionData.status === 'Credit') {
        toast.success(`Credit transaction processed: ₱${transactionData.amount.toFixed(2)} Credit recorded`);
      } else {
        toast.success(`Transaction processed: ₱${transactionData.amount.toFixed(2)}`);
      }
      
      // Dispatch event to notify dashboard of new transaction
      console.log('Dispatching transactionCreated event');
      window.dispatchEvent(new CustomEvent('transactionCreated'));
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to process transaction');
    }
  };


  const handlePayment = async (paymentType: 'full' | 'partial') => {
    if (!editingTransaction) return;

    try {
      setIsProcessingPayment(true);
      
      const payment = parseFloat(paymentAmount);
      if (isNaN(payment) || payment <= 0) {
        toast.error('Please enter a valid payment amount');
        return;
      }

      const currentTransactionAmount = editingTransaction.transactionAmount || 0;
      const totalItemAmount = editingTransaction.totalItemAmount || 0;
      const currentAmount = editingTransaction.amount; // This is the remaining balance (negative for partial/credit)
      const remainingBalance = Math.abs(currentAmount);

      // Prevent overpayment
      if (payment > remainingBalance) {
        toast.error(`Payment amount cannot exceed outstanding balance of ₱${remainingBalance.toFixed(2)}`);
        return;
      }
      
      let newTransactionAmount: number;
      let newAmount: number;
      let newStatus: 'Paid' | 'Partial' | 'Credit';

      if (paymentType === 'full') {
        // Pay the full remaining balance
        newTransactionAmount = currentTransactionAmount + remainingBalance;
        newAmount = totalItemAmount; // Now equals totalItemAmount since fully paid
        newStatus = 'Paid';
      } else {
        // Partial payment
        if (payment >= remainingBalance) {
          // Payment covers full balance
          newTransactionAmount = currentTransactionAmount + remainingBalance;
          newAmount = totalItemAmount; // Now equals totalItemAmount since fully paid
          newStatus = 'Paid';
        } else {
          // Partial payment - still has remaining balance
          newTransactionAmount = currentTransactionAmount + payment;
          newAmount = -(remainingBalance - payment); // Negative amount for remaining balance
          newStatus = 'Partial';
        }
      }

      // Update the transaction
      await transactionService.updateTransaction(editingTransaction.id, {
        transactionAmount: newTransactionAmount,
        amount: newAmount,
        status: newStatus
      });

      // Refresh data
      const transactionsResponse = await transactionService.getTransactions();
      const studentsResponse = await studentService.getStudents();
      
      const studentsMap = new Map();
      studentsResponse.documents.forEach((student: any) => {
        studentsMap.set(student.studentId, student);
      });
      
      const transformedTransactions: Transaction[] = transactionsResponse.documents.map((txn: any) => {
        const student = studentsMap.get(txn.studentId);
        
        let timestamp: Date;
        try {
          timestamp = new Date(txn.$createdAt || txn.createdAt);
          if (isNaN(timestamp.getTime())) {
            console.warn('Invalid timestamp for transaction:', txn.$id, txn.$createdAt);
            timestamp = new Date(); 
          }
        } catch (error) {
          console.warn('Error parsing timestamp for transaction:', txn.$id, error);
          timestamp = new Date(); 
        }
        
        return {
          id: txn.$id,
          studentId: txn.studentId,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
          course: student ? student.course : 'Unknown',
          amount: txn.amount,
          transactionAmount: txn.transactionAmount,
          itemPrices: txn.itemPrices,
          totalItemAmount: txn.totalItemAmount,
          timestamp: timestamp,
          cashier: txn.cashierId || 'Admin',
          status: txn.status || 'completed',
        };
      });
      
      console.log('Refreshed transaction data:', transformedTransactions.find(t => t.id === editingTransaction.id));
      
      // Ensure newest transactions appear first
      const sortedTransactions = transformedTransactions.sort((a, b) => {
        const timeDiff = b.timestamp.getTime() - a.timestamp.getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.id.localeCompare(a.id);
      });
      setTransactions(sortedTransactions);
      setEditingTransaction(null);
      setPaymentAmount('');
      
      if (newStatus === 'Paid') {
        toast.success('Payment completed! Transaction is now fully paid.');
      } else {
        toast.success(`Partial payment of ₱${payment.toFixed(2)} processed. Remaining balance: ₱${Math.abs(newAmount).toFixed(2)}`);
      }
      
      // Dispatch event to notify students page of transaction update
      window.dispatchEvent(new CustomEvent('transactionUpdated'));
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTransaction) return;

    try {
      
      await transactionService.deleteTransaction(deletingTransaction.id);

      
      const transactionsResponse = await transactionService.getTransactions();
      const studentsResponse = await studentService.getStudents();
      
      
      const studentsMap = new Map();
      studentsResponse.documents.forEach((student: any) => {
        studentsMap.set(student.studentId, student);
      });
      
      
      const transformedTransactions: Transaction[] = transactionsResponse.documents.map((txn: any) => {
        const student = studentsMap.get(txn.studentId);
        
        
        let timestamp: Date;
        try {
          // Appwrite stores timestamps in ISO format, parse directly
          timestamp = new Date(txn.$createdAt || txn.createdAt);
          if (isNaN(timestamp.getTime())) {
            console.warn('Invalid timestamp for transaction:', txn.$id, txn.$createdAt);
            timestamp = new Date(); 
          }
        } catch (error) {
          console.warn('Error parsing timestamp for transaction:', txn.$id, error);
          timestamp = new Date(); 
        }
        
        return {
          id: txn.$id,
          studentId: txn.studentId,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
          course: student ? student.course : 'Unknown',
          amount: txn.amount,
          timestamp: timestamp,
          cashier: txn.cashierId || 'Admin',
          status: txn.status || 'completed',
        };
      });
      
      // Ensure newest transactions appear first
      const sortedTransactions = transformedTransactions.sort((a, b) => {
        const timeDiff = b.timestamp.getTime() - a.timestamp.getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.id.localeCompare(a.id);
      });
      setTransactions(sortedTransactions);
      setDeletingTransaction(null);
      toast.success('Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <Button onClick={() => setShowBarcodeScanner(true)}>
          <Plus className="h-4 w-4 mr-2" />
           New Transaction
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className='bg-primary'>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{transactions.length}</div>
            <p className="text-xs text-muted-foreground text-white">All time</p>
          </CardContent>
        </Card>

        <Card className='bg-primary'>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Today's Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">₱{transactions
              .filter(t => {
                const today = new Date();
                const txnDate = t.timestamp && !isNaN(t.timestamp.getTime()) ? new Date(t.timestamp) : null;
                return txnDate && txnDate.toDateString() === today.toDateString() && (t.status === 'Paid' || t.status === 'completed' || t.status === 'Partial');
              })
              .reduce((sum, t) => {
                if (t.status === 'Partial') {
                  return sum + (t.transactionAmount || 0);
                } else {
                  return sum + (t.totalItemAmount || 0);
                }
              }, 0)
              .toFixed(2)}</div>
            <p className="text-xs text-muted-foreground text-white">Item sales revenue</p>
          </CardContent>
        </Card>

        <Card className='bg-primary'>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">₱{transactions
              .filter(t => {
                const now = new Date();
                const txnDate = t.timestamp && !isNaN(t.timestamp.getTime()) ? new Date(t.timestamp) : null;
                return txnDate && txnDate.getMonth() === now.getMonth() && 
                       txnDate.getFullYear() === now.getFullYear() && 
                       (t.status === 'Paid' || t.status === 'completed' || t.status === 'Partial');
              })
              .reduce((sum, t) => {
                if (t.status === 'Partial') {
                  return sum + (t.transactionAmount || 0);
                } else {
                  return sum + (t.totalItemAmount || 0);
                }
              }, 0)
              .toFixed(2)}</div>
            <p className="text-xs text-muted-foreground  text-white">Monthly item sales</p>
          </CardContent>
        </Card>

        <Card className='bg-primary'>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Average Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold  text-white">₱{transactions.length > 0 
              ? (transactions.reduce((sum, t) => {
                  if (t.status === 'Partial') {
                    return sum + (t.transactionAmount || 0);
                  } else {
                    return sum + (t.totalItemAmount || 0);
                  }
                }, 0) / transactions.length).toFixed(2)
              : '0.00'}</div>
            <p className="text-xs text-muted-foreground  text-white">Average item sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search transaction</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by student name, ID, or transaction number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {dateRange.from && !isNaN(dateRange.from.getTime()) ? formatDateFns(dateRange.from, "LLL dd, y") : 'Invalid Date'} -{" "}
                          {dateRange.to && !isNaN(dateRange.to.getTime()) ? formatDateFns(dateRange.to, "LLL dd, y") : 'Invalid Date'}
                        </>
                      ) : (
                        dateRange.from && !isNaN(dateRange.from.getTime()) ? formatDateFns(dateRange.from, "LLL dd, y") : 'Invalid Date'
                      )
                    ) : (
                      <span>Select date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from && !isNaN(dateRange.from.getTime()) ? dateRange.from : undefined}
                    selected={dateRange}
                    onSelect={(range) => setDateRange({ from: range?.from,
                      to: range?.to
                    })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader className='flex flex-col gap-2'>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Showing {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions (Page {currentPage} of {totalPages})
          </CardDescription>
          <DottedSeparator/>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold px-4">Student</TableHead>
                  <TableHead className="font-bold text-right px-4">Amount</TableHead>
                  <TableHead className="font-bold px-4">Status</TableHead>
                  <TableHead className="font-bold hidden sm:table-cell px-4">Date</TableHead>
                  <TableHead className="font-bold text-center px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="px-4">
                      <div>
                        <p className="text-sm">{transaction.studentName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{transaction.studentId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-4">
                      <span className={
                        transaction.status === 'Credit' 
                          ? 'text-red-600' 
                          : transaction.status === 'Partial' 
                            ? 'text-yellow-600' 
                            : ''
                      }>
                        ₱{transaction.amount.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell className="hidden sm:table-cell px-4">
                      <div>
                        <p className="text-xs">{formatDate(transaction.timestamp)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(transaction.timestamp)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center px-4">
                      <div className="flex gap-1 justify-center items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedTransaction(transaction)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingTransaction(transaction);
                            setPaymentAmount('');
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeletingTransaction(transaction)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
             <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-xl font-bold">Transaction Details</DialogTitle>
            <DialogDescription className="text-sm">
              Transaction Number: <span className="font-mono font-medium ml-1">{selectedTransaction?.id}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Transaction Header */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Transaction Information</h3>
                  <p className="text-xs text-gray-600">Transaction #{selectedTransaction?.id}</p>
                </div>
                <div className="text-right">
                  {selectedTransaction && getStatusBadge(selectedTransaction.status)}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Student</Label>
                    <p className="text-base font-semibold text-gray-900 mt-1">{selectedTransaction?.studentName}</p>
                    <p className="text-xs text-gray-600 font-mono">{selectedTransaction?.studentId}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Course</Label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedTransaction?.course}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Transaction Amount</Label>
                    <p className="text-xl font-bold text-blue-600 mt-1">
                      ₱{(selectedTransaction?.transactionAmount || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Amount paid by student</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Item Value</Label>
                    <p className="text-xl font-bold text-green-600 mt-1">
                      ₱{(selectedTransaction?.totalItemAmount || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Total item cost</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date & Time</Label>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedTransaction && formatDate(selectedTransaction.timestamp)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {selectedTransaction && formatTime(selectedTransaction.timestamp)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cashier</Label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedTransaction?.cashier}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Outstanding Balance for this Transaction only */}
            {selectedTransaction && (
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Outstanding Balance</h3>
                  <div className="text-xs text-gray-500">
                    {(() => {
                      const hasOutstanding =
                        selectedTransaction.status === 'Credit' ||
                        (selectedTransaction.status === 'Partial' && selectedTransaction.amount < 0);
                      const count = hasOutstanding ? 1 : 0;
                      return `${count} ${count === 1 ? 'balance' : 'balances'}`;
                    })()}
                  </div>
                </div>
                
                <div>
                  {(() => {
                    const showThis =
                      selectedTransaction.status === 'Credit' ||
                      (selectedTransaction.status === 'Partial' && selectedTransaction.amount < 0);
                    
                    if (!showThis) {
                      return (
                        <div className="text-center py-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h4 className="text-sm font-medium text-gray-900 mb-1">No Outstanding Balance</h4>
                          <p className="text-xs text-gray-600">This transaction has no pending balance.</p>
                        </div>
                      );
                    }
                    
                    const txn = selectedTransaction;
                    return (
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${txn.status === 'Credit' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">
                              Transaction #{txn.id.slice(-8)}
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatDate(txn.timestamp)} • {txn.status}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${txn.status === 'Credit' ? 'text-red-600' : 'text-yellow-600'}`}>
                            ₱{txn.status === 'Credit' 
                              ? (txn.totalItemAmount || 0).toFixed(2)
                              : Math.abs(txn.amount).toFixed(2)
                            }
                          </p>
                          <p className="text-xs text-gray-500">
                            {txn.status === 'Credit' ? 'Outstanding Loan' : 'Remaining Balance'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Modal */}
      <Dialog open={showBarcodeScanner} onOpenChange={setShowBarcodeScanner}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process New Transaction</DialogTitle>
            <DialogDescription>
              Scan student ID and process payment
            </DialogDescription>
          </DialogHeader>
          
          <BarcodeScanner onAddTransaction={handleNewTransaction} />
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Modal */}
      <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Transaction Payment</DialogTitle>
            <DialogDescription>
              Process payment for {editingTransaction?.studentName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Transaction Summary - Horizontal Layout */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">Transaction Summary</h3>
                <div className="text-sm text-gray-500 font-mono">
                  #{editingTransaction?.id}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Transaction Amount</Label>
                  <p className="text-xl font-bold text-blue-600 mt-1">
                    ₱{(editingTransaction?.transactionAmount || 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Item Value</Label>
                  <p className="text-xl font-bold text-green-600 mt-1">
                    ₱{(editingTransaction?.totalItemAmount || 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Outstanding</Label>
                  <p className="text-xl font-bold text-amber-600 mt-1">
                    ₱{( 
                      editingTransaction &&
                      (editingTransaction.status === 'Partial' || editingTransaction.status === 'Credit')
                        ? Math.abs(editingTransaction.amount || 0)
                        : 0
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Section - Compact Layout */}
            {(editingTransaction?.status === 'Partial' || editingTransaction?.status === 'Credit') && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between gap-6">
                  {/* Payment Input */}
                  <div className="flex-1">
                    <Label htmlFor="payment-amount" className="text-sm font-medium text-gray-700">
                      Payment Amount (₱)
                    </Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                      max={Math.abs(editingTransaction?.amount || 0)}
                    />
                    {paymentAmount && parseFloat(paymentAmount) > Math.abs(editingTransaction?.amount || 0) && (
                      <p className="text-xs text-red-600 mt-1">
                        ⚠️ Cannot exceed outstanding balance
                      </p>
                    )}
                  </div>

                  {/* Quick Fill Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPaymentAmount(Math.abs(editingTransaction?.amount || 0).toString())}
                      variant="outline"
                      size="sm"
                    >
                      Full
                    </Button>
                    <Button
                      onClick={() => setPaymentAmount((Math.abs(editingTransaction?.amount || 0) / 2).toFixed(2))}
                      variant="outline"
                      size="sm"
                    >
                      Half
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setEditingTransaction(null)}
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => handlePayment('partial')}
                      disabled={!paymentAmount || isProcessingPayment || parseFloat(paymentAmount) > Math.abs(editingTransaction?.amount || 0)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isProcessingPayment ? (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </div>
                      ) : (
                        'Update'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingTransaction} onOpenChange={() => setDeletingTransaction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              Delete Transaction
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="space-y-2">
                  <p className="font-semibold text-red-800">Transaction Details</p>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-700">
                      {deletingTransaction?.studentName}
                    </p>
                    <p className="text-lg font-bold text-red-800">
                      ₱{deletingTransaction?.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-red-500 font-mono">
                      ID: {deletingTransaction?.id}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setDeletingTransaction(null)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteTransaction}
                className="bg-red-600 hover:bg-red-700 px-6"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Transaction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}