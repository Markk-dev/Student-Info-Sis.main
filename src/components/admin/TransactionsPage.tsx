import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Plus, Search, Filter, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { transactionService, studentService } from '@/lib/services';
import { format as formatDateFns } from 'date-fns';
import { BarcodeScanner } from './BarcodeScanner';

interface Transaction {
  id: string;
  studentId: string;
  studentName: string;
  course: string;
  amount: number;
  timestamp: Date;
  cashier: string;
  status: 'completed' | 'pending' | 'refunded';
  type: string;
  notes?: string;
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
  const [editForm, setEditForm] = useState({
    amount: '',
    notes: '',
    type: 'purchase'
  });
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  // Load transactions from database
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const transactionsResponse = await transactionService.getTransactions();
        
        const studentsResponse = await studentService.getStudents();
        
        // Create a map of student data for quick lookup
        const studentsMap = new Map();
        studentsResponse.documents.forEach((student: any) => {
          studentsMap.set(student.studentId, student);
        });
        
        // Transform Appwrite data to our interface
        const transformedTransactions: Transaction[] = transactionsResponse.documents.map((txn: any) => {
          const student = studentsMap.get(txn.studentId);
          
          // Validate and create date safely
          let timestamp: Date;
          try {
            timestamp = new Date(txn.createdAt);
            if (isNaN(timestamp.getTime())) {
              timestamp = new Date(); // Fallback to current date if invalid
            }
          } catch (error) {
            timestamp = new Date(); // Fallback to current date if error
          }
          
          return {
            id: txn.$id,
            studentId: txn.studentId,
            studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
            course: student ? student.course : 'Unknown',
            amount: txn.amount,
            timestamp: timestamp,
            cashier: txn.cashierId || 'Admin',
            status: txn.type === 'refund' ? 'refunded' : 'completed',
            type: txn.type,
            notes: txn.notes
          };
        });
        
        setTransactions(transformedTransactions);
      } catch (error) {
        toast.error('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, []);

  // Get unique values for filters
  const courses = useMemo(() => {
    const uniqueCourses = [...new Set(transactions.map(t => t.course))];
    return uniqueCourses.sort();
  }, [transactions]);

  // Filter transactions
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

  const getStatusBadge = (status: Transaction['status']) => {
    const config = {
      completed: { variant: 'default' as const, className: 'inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 border border-green-200 rounded-full' },
      pending: { variant: 'secondary' as const, className: 'inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-full' },
      refunded: { variant: 'destructive' as const, className: 'inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 border border-red-200 rounded-full' }
    };

    const { variant, className } = config[status];

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
    return formatDateFns(date, 'MMM dd, yyyy');
  };

  const formatTime = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return 'Invalid Time';
    }
    return formatDateFns(date, 'HH:mm');
  };

  const exportCSV = () => {
    // Create CSV content
    const headers = ['Transaction Number', 'Student ID', 'Student Name', 'Course', 'Amount', 'Date', 'Time', 'Cashier', 'Status', 'Type'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t => [
        t.id,
        t.studentId,
        `"${t.studentName}"`,
        `"${t.course}"`,
        t.amount.toFixed(2),
        formatDate(t.timestamp),
        formatTime(t.timestamp),
        `"${t.cashier}"`,
        t.status,
        t.type
      ].join(','))
    ].join('\n');

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${formatDateFns(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully');
  };

  const handleNewTransaction = async (transactionData: any) => {
    try {
      // Create transaction in database
      const newTransaction = await transactionService.createTransaction({
        studentId: transactionData.studentId,
        amount: transactionData.amount,
        type: 'purchase',
        cashierId: 'admin_002', // Current admin ID
        notes: `Transaction processed via barcode scanner`
      });

      // Reload transactions to get updated data
      const transactionsResponse = await transactionService.getTransactions();
      const studentsResponse = await studentService.getStudents();
      
      // Create a map of student data for quick lookup
      const studentsMap = new Map();
      studentsResponse.documents.forEach((student: any) => {
        studentsMap.set(student.studentId, student);
      });
      
      // Transform Appwrite data to our interface
      const transformedTransactions: Transaction[] = transactionsResponse.documents.map((txn: any) => {
        const student = studentsMap.get(txn.studentId);
        
        // Validate and create date safely
        let timestamp: Date;
        try {
          timestamp = new Date(txn.createdAt);
          if (isNaN(timestamp.getTime())) {
            timestamp = new Date(); // Fallback to current date if invalid
          }
        } catch (error) {
          timestamp = new Date(); // Fallback to current date if error
        }
        
        return {
          id: txn.$id,
          studentId: txn.studentId,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
          course: student ? student.course : 'Unknown',
          amount: txn.amount,
          timestamp: timestamp,
          cashier: txn.cashierId || 'Admin',
          status: txn.type === 'refund' ? 'refunded' : 'completed',
          type: txn.type,
          notes: txn.notes
        };
      });
      
      setTransactions(transformedTransactions);
      setShowBarcodeScanner(false);
      toast.success(`Transaction processed: ₱${transactionData.amount.toFixed(2)}`);
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to process transaction');
    }
  };

  const handleEditTransaction = async () => {
    if (!editingTransaction) return;

    try {
      const amount = parseFloat(editForm.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      // Update transaction in database
      await transactionService.updateTransaction(editingTransaction.id, {
        amount: amount,
        type: editForm.type as 'purchase' | 'refund' | 'deposit',
        notes: editForm.notes
      });

      // Reload transactions
      const transactionsResponse = await transactionService.getTransactions();
      const studentsResponse = await studentService.getStudents();
      
      // Create a map of student data for quick lookup
      const studentsMap = new Map();
      studentsResponse.documents.forEach((student: any) => {
        studentsMap.set(student.studentId, student);
      });
      
      // Transform Appwrite data to our interface
      const transformedTransactions: Transaction[] = transactionsResponse.documents.map((txn: any) => {
        const student = studentsMap.get(txn.studentId);
        
        // Validate and create date safely
        let timestamp: Date;
        try {
          timestamp = new Date(txn.createdAt);
          if (isNaN(timestamp.getTime())) {
            timestamp = new Date(); // Fallback to current date if invalid
          }
        } catch (error) {
          timestamp = new Date(); // Fallback to current date if error
        }
        
        return {
          id: txn.$id,
          studentId: txn.studentId,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
          course: student ? student.course : 'Unknown',
          amount: txn.amount,
          timestamp: timestamp,
          cashier: txn.cashierId || 'Admin',
          status: txn.type === 'refund' ? 'refunded' : 'completed',
          type: txn.type,
          notes: txn.notes
        };
      });
      
      setTransactions(transformedTransactions);
      setEditingTransaction(null);
      setEditForm({ amount: '', notes: '', type: 'purchase' });
      toast.success('Transaction updated successfully');
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTransaction) return;

    try {
      // Delete transaction from database
      await transactionService.deleteTransaction(deletingTransaction.id);

      // Reload transactions
      const transactionsResponse = await transactionService.getTransactions();
      const studentsResponse = await studentService.getStudents();
      
      // Create a map of student data for quick lookup
      const studentsMap = new Map();
      studentsResponse.documents.forEach((student: any) => {
        studentsMap.set(student.studentId, student);
      });
      
      // Transform Appwrite data to our interface
      const transformedTransactions: Transaction[] = transactionsResponse.documents.map((txn: any) => {
        const student = studentsMap.get(txn.studentId);
        
        // Validate and create date safely
        let timestamp: Date;
        try {
          timestamp = new Date(txn.createdAt);
          if (isNaN(timestamp.getTime())) {
            timestamp = new Date(); // Fallback to current date if invalid
          }
        } catch (error) {
          timestamp = new Date(); // Fallback to current date if error
        }
        
        return {
          id: txn.$id,
          studentId: txn.studentId,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
          course: student ? student.course : 'Unknown',
          amount: txn.amount,
          timestamp: timestamp,
          cashier: txn.cashierId || 'Admin',
          status: txn.type === 'refund' ? 'refunded' : 'completed',
          type: txn.type,
          notes: txn.notes
        };
      });
      
      setTransactions(transformedTransactions);
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
          + New Transaction
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{transactions.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Today's Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">₱{transactions
              .filter(t => {
                const today = new Date();
                const txnDate = t.timestamp && !isNaN(t.timestamp.getTime()) ? new Date(t.timestamp) : null;
                return txnDate && txnDate.toDateString() === today.toDateString() && t.status === 'completed';
              })
              .reduce((sum, t) => sum + t.amount, 0)
              .toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Completed transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">₱{transactions
              .filter(t => {
                const now = new Date();
                const txnDate = t.timestamp && !isNaN(t.timestamp.getTime()) ? new Date(t.timestamp) : null;
                return txnDate && txnDate.getMonth() === now.getMonth() && 
                       txnDate.getFullYear() === now.getFullYear() && 
                       t.status === 'completed';
              })
              .reduce((sum, t) => sum + t.amount, 0)
              .toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Monthly revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">₱{transactions.length > 0 
              ? (transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length).toFixed(2)
              : '0.00'}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
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
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
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
                    onSelect={(range) => setDateRange({
                      from: range?.from,
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
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction Number</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction, index) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono">{transaction.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{transaction.studentName}</p>
                        <p className="text-sm text-muted-foreground font-mono">{transaction.studentId}</p>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.course}</TableCell>
                    <TableCell>₱{transaction.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <div>
                        <p>{formatDate(transaction.timestamp)}</p>
                        <p className="text-sm text-muted-foreground">{formatTime(transaction.timestamp)}</p>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.cashier}</TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTransaction(transaction)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTransaction(transaction);
                            setEditForm({
                              amount: transaction.amount.toString(),
                              notes: transaction.notes || '',
                              type: transaction.type
                            });
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingTransaction(transaction)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl font-bold">Transaction Details</DialogTitle>
            <DialogDescription className="text-base">
              Transaction Number: <span className="font-mono font-medium ml-2">{selectedTransaction?.id}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Transaction Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Transaction Number</Label>
                  <Input
                    value={selectedTransaction?.id || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Student Name</Label>
                  <p className="text-lg font-semibold mt-1">{selectedTransaction?.studentName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Course</Label>
                  <p className="text-lg mt-1">{selectedTransaction?.course}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                  <p className="text-lg mt-1">{selectedTransaction && formatDate(selectedTransaction.timestamp)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Cashier</Label>
                  <p className="text-lg mt-1">{selectedTransaction?.cashier}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">{selectedTransaction && getStatusBadge(selectedTransaction.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Student ID</Label>
                  <p className="font-mono text-lg font-semibold mt-1">{selectedTransaction?.studentId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                  <p className="text-2xl font-bold text-green-600 mt-1">₱{selectedTransaction?.amount.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Time</Label>
                  <p className="text-lg mt-1">{selectedTransaction && formatTime(selectedTransaction.timestamp)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                  <p className="text-lg capitalize mt-1">{selectedTransaction?.type}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedTransaction?.notes && (
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                <div className="mt-2 p-4 bg-muted/50 rounded-lg border">
                  <p className="text-base leading-relaxed">{selectedTransaction.notes}</p>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update transaction details for {editingTransaction?.studentName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Transaction Number</Label>
              <Input
                value={editingTransaction?.id || ''}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-amount">Amount (₱)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Transaction Type</Label>
                <Select value={editForm.type} onValueChange={(value) => setEditForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes about this transaction..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingTransaction(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditTransaction}>
                Update Transaction
              </Button>
            </div>
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