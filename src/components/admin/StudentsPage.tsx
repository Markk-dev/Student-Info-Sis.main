import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, UserPlus, CheckCircle, XCircle, Flag, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { studentService, transactionService } from '@/lib/services';
import { format } from 'date-fns';
import { DottedSeparator } from '../ui/dotted-line';

interface Student {
  id: string;
  name: string;
  course: string;
  yearLevel: string;
  registrationDate: Date;
  totalTransactions: number;
  totalSpent: number;
  status: 'active' | 'flagged' | 'suspended' | 'inactive';
  lastTransaction?: Date;
  issues: string[];
  unpaidAmount: number;
  email: string;
  suspensionDate?: Date;
}

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [actionType, setActionType] = useState<'flag' | 'issue' | 'update' | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [suspensionPeriod, setSuspensionPeriod] = useState('1day');
  const [customDays, setCustomDays] = useState('');

  
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true);
        
        
        await studentService.checkSuspensionStatus();
        
        const studentsResponse = await studentService.getStudents();
        const transactionsResponse = await transactionService.getTransactions();
        
        
        const transformedStudents: Student[] = studentsResponse.documents.map((student: any) => {
          const studentTransactions = transactionsResponse.documents.filter(
            (txn: any) => txn.studentId === student.studentId
          );
          
          const totalSpent = studentTransactions.reduce((sum: number, txn: any) => {
            return sum + (txn.status === 'Paid' ? txn.amount : 0);
          }, 0);
          
          const unpaidAmount = studentTransactions.reduce((sum: number, txn: any) => {
            return sum + (txn.status === 'Credit' ? Math.abs(txn.amount) : 0);
          }, 0);
          
          const lastTransaction = studentTransactions.length > 0 
            ? (() => {
                const dates = studentTransactions.map((txn: any) => {
                  try {
                    // Try both createdAt and $createdAt fields
                    const date = new Date(txn.$createdAt || txn.createdAt);
                    return isNaN(date.getTime()) ? null : date;
                  } catch (error) {
                    return null;
                  }
                }).filter(date => date !== null);
                
                return dates.length > 0 ? new Date(Math.max(...dates.map(d => d!.getTime()))) : undefined;
              })()
            : undefined;
          
          
          let status: 'active' | 'flagged' | 'suspended' | 'inactive' = 'active';
          
          if (!student.isActive) {
            status = 'suspended';
          } else {
            // Check if student has made at least 3 transactions in the past 3 days
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            
            const recentTransactions = studentTransactions.filter((txn: any) => {
              try {
                const txnDate = new Date(txn.$createdAt || txn.createdAt);
                return !isNaN(txnDate.getTime()) && txnDate >= threeDaysAgo;
              } catch (error) {
                return false;
              }
            });
            
            if (recentTransactions.length >= 3) {
              status = 'active';
            } else {
              status = 'inactive';
            }
          }
          
          return {
            id: student.studentId,
            name: `${student.firstName} ${student.lastName}`,
            course: student.course,
            yearLevel: student.yearLevel,
            registrationDate: (() => {
              try {
                const date = new Date(student.createdAt);
                return isNaN(date.getTime()) ? new Date() : date;
              } catch (error) {
                return new Date();
              }
            })(),
            totalTransactions: studentTransactions.length,
            totalSpent,
            status,
            lastTransaction,
            issues: [], 
            unpaidAmount,
            email: student.email,
            suspensionDate: student.suspensionDate ? (() => {
              try {
                const date = new Date(student.suspensionDate);
                return isNaN(date.getTime()) ? undefined : date;
              } catch (error) {
                return undefined;
              }
            })() : undefined
          };
        });
        
        setStudents(transformedStudents);
        setTransactions(transactionsResponse.documents);
      } catch (error) {
        console.error('Error loading students:', error);
        toast.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, []);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true);
        
        
        await studentService.checkSuspensionStatus();
        
        const studentsResponse = await studentService.getStudents();
        const transactionsResponse = await transactionService.getTransactions();
        
        
        const transformedStudents: Student[] = studentsResponse.documents.map((student: any) => {
          const studentTransactions = transactionsResponse.documents.filter(
            (txn: any) => txn.studentId === student.studentId
          );
          
          const totalSpent = studentTransactions.reduce((sum: number, txn: any) => {
            return sum + (txn.status === 'Paid' ? txn.amount : 0);
          }, 0);
          
          const unpaidAmount = studentTransactions.reduce((sum: number, txn: any) => {
            return sum + (txn.status === 'Credit' ? Math.abs(txn.amount) : 0);
          }, 0);
          
          const lastTransaction = studentTransactions.length > 0 
            ? (() => {
                const dates = studentTransactions.map((txn: any) => {
                  try {
                    // Try both createdAt and $createdAt fields
                    const date = new Date(txn.$createdAt || txn.createdAt);
                    return isNaN(date.getTime()) ? null : date;
                  } catch (error) {
                    return null;
                  }
                }).filter(date => date !== null);
                
                return dates.length > 0 ? new Date(Math.max(...dates.map(d => d!.getTime()))) : undefined;
              })()
            : undefined;
          
          
          let status: 'active' | 'flagged' | 'suspended' | 'inactive' = 'active';
          
          if (!student.isActive) {
            status = 'suspended';
          } else {
            // Check if student has made at least 3 transactions in the past 3 days
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            
            const recentTransactions = studentTransactions.filter((txn: any) => {
              try {
                const txnDate = new Date(txn.$createdAt || txn.createdAt);
                return !isNaN(txnDate.getTime()) && txnDate >= threeDaysAgo;
              } catch (error) {
                return false;
              }
            });
            
            if (recentTransactions.length >= 3) {
              status = 'active';
            } else {
              status = 'inactive';
            }
          }
          
          return {
            id: student.studentId,
            name: `${student.firstName} ${student.lastName}`,
            course: student.course,
            yearLevel: student.yearLevel,
            registrationDate: (() => {
              try {
                const date = new Date(student.createdAt);
                return isNaN(date.getTime()) ? new Date() : date;
              } catch (error) {
                return new Date();
              }
            })(),
            totalTransactions: studentTransactions.length,
            totalSpent,
            status,
            lastTransaction,
            issues: [], 
            unpaidAmount,
            email: student.email,
            suspensionDate: student.suspensionDate ? (() => {
              try {
                const date = new Date(student.suspensionDate);
                return isNaN(date.getTime()) ? undefined : date;
              } catch (error) {
                return undefined;
              }
            })() : undefined
          };
        });
        
        setStudents(transformedStudents);
        setTransactions(transactionsResponse.documents);
      } catch (error) {
        console.error('Error loading students:', error);
        toast.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    };

    const handleTransactionUpdate = () => {
      loadStudents();
    };

    window.addEventListener('transactionCreated', handleTransactionUpdate);
    window.addEventListener('transactionUpdated', handleTransactionUpdate);

    return () => {
      window.removeEventListener('transactionCreated', handleTransactionUpdate);
      window.removeEventListener('transactionUpdated', handleTransactionUpdate);
    };
  }, []);

  
  const courses = useMemo(() => {
    const uniqueCourses = [...new Set(students.map(s => s.course))];
    return uniqueCourses.sort();
  }, [students]);

  const yearLevels = useMemo(() => {
    return ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  }, []);

  
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.course.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCourse = courseFilter === 'all' || student.course === courseFilter;
      const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
      const matchesYear = yearFilter === 'all' || student.yearLevel === yearFilter;

      return matchesSearch && matchesCourse && matchesStatus && matchesYear;
    });
  }, [students, searchTerm, courseFilter, statusFilter, yearFilter]);

  const handleStudentAction = async (student: Student, action: 'flag' | 'issue' | 'update' | 'suspend' | 'activate') => {
    if (action === 'suspend' || action === 'activate') {
      try {
        const newStatus = action === 'suspend' ? false : true;
        await studentService.updateStudent(student.id, { isActive: newStatus });
        
        setStudents(prev => 
          prev.map(s => 
            s.id === student.id 
              ? { ...s, status: action === 'suspend' ? 'suspended' : 'active' }
              : s
          )
        );
        toast.success(`Student ${action}d successfully`);
      } catch (error) {
        console.error('Error updating student status:', error);
        toast.error('Failed to update student status');
      }
    } else {
      
      setSelectedStudent(student);
      setActionType(action);
    }
  };

  const handleSaveAction = async () => {
    if (!selectedStudent || !actionType || !actionNote.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      
      
      toast.success('Action recorded successfully');
      setSelectedStudent(null);
      setActionType(null);
      setActionNote('');
    } catch (error) {
      console.error('Error saving action:', error);
      toast.error('Failed to save action');
    }
  };

  const getStatusBadge = (status: Student['status']) => {
    const config = {
      active: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-200' },
      flagged: { variant: 'secondary' as const, icon: Flag, color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-200' },
      suspended: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-200' },
      inactive: { variant: 'outline' as const, icon: Eye, color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-200' }
    };

    const { variant, icon: Icon, color, bgColor, borderColor } = config[status];

    return (
      <Badge variant={variant} className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium ${bgColor} ${color} ${borderColor} border`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Button */}
      <div className="flex justify-end">
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className='bg-primary'>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm  text-white">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{students.length}</div>
            <p className="text-xs text-muted-foreground text-white font-bold">Registered in system</p>
          </CardContent>
        </Card>

        <Card className='bg-primary'>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Active Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-white font-bold">{students.filter(s => s.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground text-white">Currently active</p>
          </CardContent>
        </Card>

        <Card className='bg-primary'>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Flagged Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{students.filter(s => s.status === 'flagged').length}</div>
            <p className="text-xs text-muted-foreground text-white">Require attention</p>
          </CardContent>
        </Card>

        <Card className='bg-primary'>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Unpaid Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-white">₱{students.reduce((sum, s) => sum + s.unpaidAmount, 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground text-white">Total outstanding</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className='flex flex-col gap-2'>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
          <DottedSeparator/>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Students</Label>
              <Input
                id="search"
                className='text-xs'
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className='text-xs'>All Courses</SelectItem>
                  {courses.map(course => (
                    <SelectItem key={course} className='text-xs' value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year Level</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue className='text-xs' placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {yearLevels.map(year => (
                    <SelectItem key={year} className='text-xs' value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 ">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue className='text-xs' placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className='text-xs ' value="all">All Statuses</SelectItem>
                  <SelectItem className='text-xs' value="active">Active</SelectItem>
                  <SelectItem className='text-xs' value="flagged">Flagged</SelectItem>
                  <SelectItem className='text-xs' value="suspended">Suspended</SelectItem>
                  <SelectItem className='text-xs' value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader className='flex flex-col gap-2'>
          <CardTitle>Student List</CardTitle>
          <CardDescription>
            Showing {filteredStudents.length} of {students.length} students
          </CardDescription>
          <DottedSeparator/>
        </CardHeader>
   
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course & Year</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Transaction</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">{student.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{student.course}</p>
                        <p className="text-sm text-muted-foreground">{student.yearLevel}</p>
                      </div>
                    </TableCell>
                    <TableCell>{student.totalTransactions}</TableCell>
                    <TableCell>₱{student.totalSpent.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(student.status)}</TableCell>
                    <TableCell>
                      {student.lastTransaction ? formatDate(student.lastTransaction) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedStudent(student);
                            setActionType(null); 
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStudentAction(student, 'flag')}>
                            <Flag className="h-4 w-4 mr-2" />
                            Flag Student
                          </DropdownMenuItem>
                          {student.status === 'active' ? (
                            <DropdownMenuItem onClick={() => {
                              setSelectedStudent(student);
                              setShowSuspensionModal(true);
                            }}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                          ) : student.status === 'inactive' || student.status === 'suspended' ? (
                            <DropdownMenuItem onClick={() => handleStudentAction(student, 'activate')}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Student Details/Action Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => {
        setSelectedStudent(null);
        setActionType(null);
        setActionNote('');
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl font-bold">
              {actionType ? `${actionType === 'flag' ? 'Flag' : 'Report Issue for'} Student` : 'Student Details'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {selectedStudent?.name} ({selectedStudent?.id})
            </DialogDescription>
          </DialogHeader>
          
          {actionType ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="action-note">
                  {actionType === 'flag' ? 'Reason for flagging' : 'Issue description'}
                </Label>
                <Textarea
                  id="action-note"
                  placeholder={actionType === 'flag' ? 'Enter reason for flagging this student...' : 'Describe the issue...'}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setActionType(null);
                  setActionNote('');
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAction}>
                  Save {actionType === 'flag' ? 'Flag' : 'Issue'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Student Header */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Student Information</h3>
                  <p className="text-xs text-gray-600">Student #{selectedStudent?.id}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Student ID</Label>
                      <p className="text-xs font-semibold text-gray-900 mt-1 font-mono">{selectedStudent?.id}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Student Name</Label>
                      <p className="text-xs font-semibold text-gray-900 mt-1">{selectedStudent?.name}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Course</Label>
                      <p className="text-xs font-medium text-gray-900 mt-1">{selectedStudent?.course}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Year Level</Label>
                      <p className="text-xs font-medium text-gray-900 mt-1">{selectedStudent?.yearLevel}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</Label>
                      <div className="mt-1">{selectedStudent && getStatusBadge(selectedStudent.status)}</div>
                    </div>
                    {selectedStudent?.suspensionDate && (
                      <div>
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suspension End Date</Label>
                        <p className="text-xs text-red-600 mt-1">{format(new Date(selectedStudent.suspensionDate), "PPP")}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Transaction Summary & Status */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Transaction Summary</h3>
                </div>
                
                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Transactions</Label>
                    <p className="text-lg font-bold text-blue-600 mt-1">{selectedStudent?.totalTransactions || 0}</p>
                    <p className="text-xs text-gray-500">All time</p>
                  </div>
                  <div className="text-center">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Spent</Label>
                    <p className="text-lg font-bold text-green-600 mt-1">₱{selectedStudent?.totalSpent.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-gray-500">Amount paid</p>
                  </div>
                  <div className="text-center">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unpaid Amount</Label>
                    <p className={`text-lg font-bold mt-1 ${(selectedStudent?.unpaidAmount ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₱{(selectedStudent?.unpaidAmount ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Outstanding balance</p>
                  </div>
                </div>

                {/* Status Breakdown */}
                {(() => {
                  // Get all transactions for this student to count by status
                  const allTransactions = transactions.filter(t => t.studentId === selectedStudent?.id);
                  const paidCount = allTransactions.filter(t => t.status === 'Paid').length;
                  const partialCount = allTransactions.filter(t => t.status === 'Partial').length;
                  const creditCount = allTransactions.filter(t => t.status === 'Credit').length;

                  return (
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-gray-900">Status Breakdown</h4>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1">
                            <span className="text-sm font-bold text-green-600">{paidCount}</span>
                          </div>
                          <p className="text-xs font-medium text-gray-900">Paid</p>
                          <p className="text-xs text-gray-500">Completed</p>
                        </div>
                        <div className="text-center">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-1">
                            <span className="text-sm font-bold text-yellow-600">{partialCount}</span>
                          </div>
                          <p className="text-xs font-medium text-gray-900">Partial</p>
                          <p className="text-xs text-gray-500">Incomplete</p>
                        </div>
                        <div className="text-center">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-1">
                            <span className="text-sm font-bold text-red-600">{creditCount}</span>
                          </div>
                          <p className="text-xs font-medium text-gray-900">Credit</p>
                          <p className="text-xs text-gray-500">Outstanding</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Issues */}
              {selectedStudent?.issues && selectedStudent.issues.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Issues & Notes</h3>
                  <div className="space-y-1">
                    {selectedStudent?.issues.map((issue, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-700">{issue}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Suspension Modal */}
      <Dialog open={showSuspensionModal} onOpenChange={setShowSuspensionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              Suspend Student
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              Set suspension period for {selectedStudent?.name} ({selectedStudent?.id})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Suspension Period</Label>
              <Select value={suspensionPeriod} onValueChange={setSuspensionPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select suspension period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1day">1 Day</SelectItem>
                  <SelectItem value="3days">3 Days</SelectItem>
                  <SelectItem value="1week">1 Week</SelectItem>
                  <SelectItem value="1month">1 Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              
              {suspensionPeriod === 'custom' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Number of Days</Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="Enter number of days"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowSuspensionModal(false);
                  setSuspensionPeriod('1day');
                  setCustomDays('');
                }}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  if (!selectedStudent) {
                    toast.error('No student selected');
                    return;
                  }
                  
                  let days = 1;
                  if (suspensionPeriod === 'custom') {
                    if (!customDays || parseInt(customDays) < 1) {
                      toast.error('Please enter a valid number of days');
                      return;
                    }
                    days = parseInt(customDays);
                  } else if (suspensionPeriod === '3days') {
                    days = 3;
                  } else if (suspensionPeriod === '1week') {
                    days = 7;
                  } else if (suspensionPeriod === '1month') {
                    days = 30;
                  }
                  
                  try {
                    const suspensionEndDate = new Date();
                    suspensionEndDate.setDate(suspensionEndDate.getDate() + days);
                    
                    await studentService.updateStudent(selectedStudent.id, { 
                      isActive: false,
                      suspensionDate: suspensionEndDate.toISOString()
                    });
                    
                    setStudents(prev => 
                      prev.map(s => 
                        s.id === selectedStudent.id 
                          ? { ...s, status: 'suspended', suspensionDate: suspensionEndDate }
                          : s
                      )
                    );
                    
                    setShowSuspensionModal(false);
                    setSuspensionPeriod('1day');
                    setCustomDays('');
                    toast.success(`Student suspended for ${days} day${days > 1 ? 's' : ''}`);
                  } catch (error) {
                    console.error('Error suspending student:', error);
                    toast.error('Failed to suspend student');
                  }
                }}
                className="bg-red-600 hover:bg-red-700 px-6"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Suspend Student
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}