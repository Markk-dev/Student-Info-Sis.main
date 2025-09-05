import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, UserPlus, CheckCircle, XCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { studentService, transactionService } from '@/lib/services';
import { format } from 'date-fns';

// Predefined arrays for courses and year levels - easily modifiable
const COURSES = [
  'BSIT', 'BSCS', 'BSIS', 'BSEMC', 'BSCE', 'BSEE', 'BSME', 'BSIE', 'BSA', 'BSBA',
  'BSHM', 'BSTM', 'BSN', 'BSMT', 'BSRT', 'BSPHARMA', 'BSPHARM',
  'AB', 'AB PSYCH', 'AB POLSCI', 'AB ENG', 'AB HIST', 'AB COMM',
  'BEED', 'BSED', 'BSE', 'BSED MATH', 'BSED SCI', 'BSED ENG',
  'BS CRIM', 'BS CIVIL ENG', 'BS IND ENG', 'EDUC', 'BSPT'
];

const YEAR_LEVELS = [
  '1st Year', '2nd Year', '3rd Year', '4th Year'
];

interface Student {
  id: string;
  name: string;
  course: string;
  yearLevel: string;
  registrationDate: Date;
  totalTransactions: number;
  totalSpent: number;
  status: 'active' | 'suspended' | 'inactive';
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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [showUnsuspendModal, setShowUnsuspendModal] = useState(false);
  const [suspensionPeriod, setSuspensionPeriod] = useState('1day');
  const [customDays, setCustomDays] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    studentId: '',
    firstName: '',
    lastName: '',
    course: '',
    yearLevel: '',
    email: ''
  });
  const [courseSearch, setCourseSearch] = useState('');
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);

  // Filtered courses based on search
  const filteredCourses = COURSES.filter(course =>
    course.toLowerCase().includes(courseSearch.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isCourseDropdownOpen && !target.closest('.course-dropdown-container')) {
        setIsCourseDropdownOpen(false);
      }
    };

    if (isCourseDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCourseDropdownOpen]);

  
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
          
          
          let status: 'active' | 'suspended' | 'inactive' = 'active';
          
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
          
          
          let status: 'active' | 'suspended' | 'inactive' = 'active';
          
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

  const handleUnsuspendStudent = async () => {
    if (!selectedStudent) {
      toast.error('No student selected');
      return;
    }

    try {
      await studentService.updateStudent(selectedStudent.id, { 
        isActive: true,
        suspensionDate: undefined
      });
      
      const studentTransactions = transactions.filter(
        (txn: any) => txn.studentId === selectedStudent.id
      );
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
      const newStatus = recentTransactions.length >= 3 ? 'active' : 'inactive';

      setStudents(prev => 
        prev.map(s => 
          s.id === selectedStudent.id 
            ? { ...s, status: newStatus, suspensionDate: undefined }
            : s
        )
      );

      setShowUnsuspendModal(false);
      setSelectedStudent(null);
      toast.success(`Student ${selectedStudent.name} has been unsuspended.`);
    } catch (error) {
      console.error('Error unsuspending student:', error);
      toast.error('Failed to unsuspend student');
    }
  };

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

  const handleAddStudent = async () => {
    if (!newStudentData.studentId || !newStudentData.firstName || !newStudentData.lastName || !newStudentData.course || !newStudentData.yearLevel) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await studentService.createStudent({
        id: newStudentData.studentId,
        name: `${newStudentData.firstName} ${newStudentData.lastName}`,
        course: newStudentData.course,
        yearLevel: newStudentData.yearLevel,
        isRegistered: true
      });

      // Refresh the students list
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
      setShowAddStudentModal(false);
      setNewStudentData({
        studentId: '',
        firstName: '',
        lastName: '',
        course: '',
        yearLevel: '',
        email: ''
      });
      setCourseSearch('');
      toast.success('Student added successfully!');
    } catch (error: any) {
      console.error('Error adding student:', error);
      if (error.message) {
        toast.error(`Error adding student: ${error.message}`);
      } else {
        toast.error('Failed to add student');
      }
    }
  };

  const getStatusBadge = (status: Student['status']) => {
    const config = {
      active: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-200' },
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
    <div className="space-y-4">
      {/* Action Button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAddStudentModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className='bg-primary'>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs text-white">Total Students</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-white">{students.length}</div>
          </CardContent>
        </Card>

        <Card className='bg-primary'>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs text-white">Active</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-white">{students.filter(s => s.status === 'active').length}</div>
          </CardContent>
        </Card>

        <Card className='bg-primary'>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs text-white">Suspended</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-white">{students.filter(s => s.status === 'suspended').length}</div>
          </CardContent>
        </Card>

        <Card className='bg-primary'>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs text-white">Unpaid</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-white">₱{students.reduce((sum, s) => sum + s.unpaidAmount, 0).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className='p-4'>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <div className="space-y-1">
              <Label htmlFor="search" className="text-xs">Search</Label>
              <Input
                id="search"
                className='text-xs h-9'
                placeholder="Name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Course</Label>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="h-9 text-xs">
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

            <div className="space-y-1">
              <Label className="text-xs">Year Level</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Years</SelectItem>
                  {yearLevels.map(year => (
                    <SelectItem key={year} className='text-xs' value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className='text-xs' value="all">All Statuses</SelectItem>
                  <SelectItem className='text-xs' value="active">Active</SelectItem>
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
        <CardHeader className='p-4'>
          <CardTitle className="text-base">Student List</CardTitle>
          <CardDescription className="text-xs">
            Showing {filteredStudents.length} of {students.length} students
          </CardDescription>
        </CardHeader>
   
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">Student</TableHead>
                  <TableHead className="hidden md:table-cell px-4">Course & Year</TableHead>
                  <TableHead className="hidden sm:table-cell px-4">Transactions</TableHead>
                  <TableHead className="hidden md:table-cell px-4">Total Spent</TableHead>
                  <TableHead className="px-5">Status</TableHead>
                  <TableHead className="hidden lg:table-cell px-4">Last Transaction</TableHead>
                  <TableHead className="px-5 ml-5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="px-4 py-2">
                      <div>
                        <p className="font-medium text-sm">{student.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{student.id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell px-4 py-2">
                      <div>
                        <p className="text-sm">{student.course}</p>
                        <p className="text-xs text-muted-foreground">{student.yearLevel}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell px-4 py-2 text-sm">{student.totalTransactions}</TableCell>
                    <TableCell className="hidden md:table-cell px-4 py-2 text-sm">₱{student.totalSpent.toFixed(2)}</TableCell>
                    <TableCell className="px-4 py-2">{getStatusBadge(student.status)}</TableCell>
                    <TableCell className="hidden lg:table-cell px-4 py-2 text-sm">
                      {student.lastTransaction ? formatDate(student.lastTransaction) : 'Never'}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-center">
                      {/* Icons for large screens */}
                      <div className="hidden lg:flex items-center justify-center gap-1 mr-3">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setSelectedStudent(student);
                              setShowDetailsModal(true); 
                          }}>
                              <span className="sr-only">View Details</span>
                              <Eye className="h-4 w-4" />
                          </Button>
                          {student.status !== 'suspended' ? (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                  setSelectedStudent(student);
                                  setShowSuspensionModal(true);
                              }}>
                                  <span className="sr-only">Suspend Student</span>
                                  <XCircle className="h-4 w-4" />
                              </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                setSelectedStudent(student);
                                setShowUnsuspendModal(true);
                            }}>
                                <span className="sr-only">Unsuspend Student</span>
                                <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                      </div>

                      {/* Dropdown for small screens */}
                      <div className="lg:hidden inline-block">
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <span className="sr-only">More Actions</span>
                                      <MoreHorizontal className="h-5 w-5" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center">
                                  <DropdownMenuItem onClick={() => {
                                      setSelectedStudent(student);
                                      setShowDetailsModal(true); 
                                  }}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                  </DropdownMenuItem>
                                  {student.status !== 'suspended' ? (
                                      <DropdownMenuItem onClick={() => {
                                          setSelectedStudent(student);
                                          setShowSuspensionModal(true);
                                      }}>
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Suspend
                                      </DropdownMenuItem>
                                  ) : (
                                      <DropdownMenuItem onClick={() => {
                                        setSelectedStudent(student);
                                        setShowUnsuspendModal(true);
                                      }}>
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Unsuspend
                                      </DropdownMenuItem>
                                  )}
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Student Details/Action Dialog */}
      <Dialog open={showDetailsModal} onOpenChange={(isOpen) => {
        setShowDetailsModal(isOpen);
        if (!isOpen) {
          setSelectedStudent(null);
        }
      }}>
        <DialogContent className="max-w-sm md:max-w-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-bold">
              Student Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedStudent?.name} ({selectedStudent?.id})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
              {/* Student Header */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Student Information</h3>
                  <p className="text-xs text-gray-600">Student #{selectedStudent?.id}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suspension End</Label>
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
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Transactions</Label>
                    <p className="text-base md:text-lg font-bold text-blue-600 mt-1">{selectedStudent?.totalTransactions || 0}</p>
                  </div>
                  <div className="text-center">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Spent</Label>
                    <p className="text-base md:text-lg font-bold text-green-600 mt-1">₱{selectedStudent?.totalSpent.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="text-center">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unpaid</Label>
                    <p className={`text-base md:text-lg font-bold mt-1 ${(selectedStudent?.unpaidAmount ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₱{(selectedStudent?.unpaidAmount ?? 0).toFixed(2)}
                    </p>
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
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1">
                            <span className="text-xs font-bold text-green-600">{paidCount}</span>
                          </div>
                          <p className="text-xs font-medium text-gray-900">Paid</p>
                        </div>
                        <div className="text-center">
                          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-1">
                            <span className="text-xs font-bold text-yellow-600">{partialCount}</span>
                          </div>
                          <p className="text-xs font-medium text-gray-900">Partial</p>
                        </div>
                        <div className="text-center">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-1">
                            <span className="text-xs font-bold text-red-600">{creditCount}</span>
                          </div>
                          <p className="text-xs font-medium text-gray-900">Credit</p>
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
        </DialogContent>
      </Dialog>

      {/* Unsuspend Modal */}
      <Dialog open={showUnsuspendModal} onOpenChange={setShowUnsuspendModal}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              Unsuspend Student
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Are you sure you want to unsuspend {selectedStudent?.name} ({selectedStudent?.id})?
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setShowUnsuspendModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUnsuspendStudent}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Unsuspend
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspension Modal */}
      <Dialog open={showSuspensionModal} onOpenChange={setShowSuspensionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              Suspend Student
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Set suspension period for {selectedStudent?.name} ({selectedStudent?.id})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Suspension Period</Label>
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
            
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowSuspensionModal(false);
                  setSuspensionPeriod('1day');
                  setCustomDays('');
                }}
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
                className="bg-red-600 hover:bg-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Suspend
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Student Modal */}
      <Dialog open={showAddStudentModal} onOpenChange={setShowAddStudentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              Add New Student
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Enter student information to register them in the system
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="new-student-id" className="text-sm font-medium">Student ID *</Label>
                <Input
                  id="new-student-id"
                  placeholder="Enter student ID"
                  value={newStudentData.studentId}
                  onChange={(e) => setNewStudentData(prev => ({ ...prev, studentId: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="new-student-firstName" className="text-sm font-medium">First Name *</Label>
                  <Input
                    id="new-student-firstName"
                    placeholder="First name"
                    value={newStudentData.firstName}
                    onChange={(e) => setNewStudentData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="new-student-lastName" className="text-sm font-medium">Last Name *</Label>
                  <Input
                    id="new-student-lastName"
                    placeholder="Last name"
                    value={newStudentData.lastName}
                    onChange={(e) => setNewStudentData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="new-student-email" className="text-sm font-medium">Email (Optional)</Label>
                <Input
                  id="new-student-email"
                  type="email"
                  placeholder="student@email.com"
                  value={newStudentData.email}
                  onChange={(e) => setNewStudentData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="new-student-course" className="text-sm font-medium">Course *</Label>
                <div className="relative course-dropdown-container mt-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      placeholder="Search course..."
                      value={newStudentData.course || courseSearch}
                      onChange={(e) => {
                        setCourseSearch(e.target.value);
                        if (e.target.value !== newStudentData.course) {
                          setNewStudentData(prev => ({ ...prev, course: '' }));
                        }
                      }}
                      onFocus={() => setIsCourseDropdownOpen(true)}
                      className={`pl-7 ${newStudentData.course ? 'bg-green-50 border-green-300' : ''}`}
                    />
                  </div>
                  {isCourseDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {filteredCourses.length > 0 ? (
                        filteredCourses.slice(0, 10).map((course) => (
                          <button
                            key={course}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setNewStudentData(prev => ({ ...prev, course: course }));
                              setCourseSearch('');
                              setIsCourseDropdownOpen(false);
                            }}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          >
                            {course}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-1.5 text-sm text-gray-500">No courses found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="new-student-year" className="text-sm font-medium">Year Level *</Label>
                <Select
                  value={newStudentData.yearLevel}
                  onValueChange={(value) => setNewStudentData(prev => ({ ...prev, yearLevel: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select year level" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_LEVELS.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddStudentModal(false);
                  setNewStudentData({
                    studentId: '',
                    firstName: '',
                    lastName: '',
                    course: '',
                    yearLevel: '',
                    email: ''
                  });
                  setCourseSearch('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddStudent}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}