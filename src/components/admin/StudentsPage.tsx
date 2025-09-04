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
                    const date = new Date(txn.createdAt);
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
            
            if (lastTransaction) {
              const daysSinceLastTransaction = Math.floor((Date.now() - lastTransaction.getTime()) / (1000 * 60 * 60 * 24));
              if (daysSinceLastTransaction > 3) {
                status = 'inactive';
              }
            } else {
              
              status = 'active';
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
      } catch (error) {
        console.error('Error loading students:', error);
        toast.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, []);

  
  const courses = useMemo(() => {
    const uniqueCourses = [...new Set(students.map(s => s.course))];
    return uniqueCourses.sort();
  }, [students]);

  const yearLevels = useMemo(() => {
    const uniqueYears = [...new Set(students.map(s => s.yearLevel))];
    return uniqueYears.sort();
  }, [students]);

  
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
        <DialogContent className="max-w-3xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl font-bold">
              {actionType ? `${actionType === 'flag' ? 'Flag' : 'Report Issue for'} Student` : 'Student Details'}
            </DialogTitle>
            <DialogDescription className="text-base">
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
            <div className="space-y-6">
              {/* Student Info */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Student ID</Label>
                    <p className="font-mono text-lg font-semibold mt-1">{selectedStudent?.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                    <p className="text-lg font-semibold mt-1">{selectedStudent?.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="text-lg mt-1">{selectedStudent?.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Course</Label>
                    <p className="text-lg mt-1">{selectedStudent?.course}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Year Level</Label>
                    <p className="text-lg mt-1">{selectedStudent?.yearLevel}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Registration Date</Label>
                    <p className="text-lg mt-1">{selectedStudent && formatDate(selectedStudent.registrationDate)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="mt-1">{selectedStudent && getStatusBadge(selectedStudent.status)}</div>
                  </div>
                  {selectedStudent?.suspensionDate && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Suspension End Date</Label>
                      <p className="text-lg text-red-600 mt-1">{format(new Date(selectedStudent.suspensionDate), "PPP")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Summary */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <Label className="text-sm font-medium text-muted-foreground">Total Transactions</Label>
                  <p className="text-2xl font-bold mt-1">{selectedStudent?.totalTransactions || 0}</p>
                </div>
                <div className="text-center">
                  <Label className="text-sm font-medium text-muted-foreground">Total Spent</Label>
                  <p className="text-2xl font-bold mt-1">₱{selectedStudent?.totalSpent.toFixed(2) || '0.00'}</p>
                </div>
                <div className="text-center">
                  <Label className="text-sm font-medium text-muted-foreground">Unpaid Amount</Label>
                  <p className={`text-2xl font-bold mt-1 ${(selectedStudent?.unpaidAmount ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₱{(selectedStudent?.unpaidAmount ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Issues */}
              {selectedStudent?.issues.length && selectedStudent?.issues.length > 0 && (
                <div>
                  <Label>Issues & Notes</Label>
                  <div className="space-y-2 mt-2">
                    {selectedStudent?.issues.map((issue, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">{issue}</p>
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