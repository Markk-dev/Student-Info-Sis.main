import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, UserX, ShoppingCart, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { studentService } from '@/lib/services';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  course: string;
  yearLevel: string;
  isRegistered: boolean;
}

interface BarcodeScannerProps {
  onAddTransaction: (transaction: any) => void;
}

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

export function BarcodeScanner({ onAddTransaction }: BarcodeScannerProps) {
  const [studentId, setStudentId] = useState('');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [isNewStudent, setIsNewStudent] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [itemPrices, setItemPrices] = useState<string[]>(['']);
  const [transactionStatus, setTransactionStatus] = useState('');
  const [newStudentData, setNewStudentData] = useState({
    firstName: '',
    lastName: '',
    course: '',
    yearLevel: ''
  });
  const [courseSearch, setCourseSearch] = useState('');
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtered courses based on search
  const filteredCourses = COURSES.filter(course =>
    course.toLowerCase().includes(courseSearch.toLowerCase())
  );

  // Calculate total from item prices
  const totalItemPrices = itemPrices.reduce((sum, price) => {
    const numPrice = parseFloat(price) || 0;
    return sum + numPrice;
  }, 0);

  // Calculate change (Transaction Amount - Total Item Prices)
  const transactionAmountNum = parseFloat(transactionAmount) || 0;
  const change = transactionAmountNum - totalItemPrices;

  // Add new item price field
  const addItemPrice = () => {
    setItemPrices(prev => [...prev, '']);
  };

  // Update specific item price
  const updateItemPrice = (index: number, value: string) => {
    setItemPrices(prev => prev.map((price, i) => i === index ? value : price));
  };

  // Remove item price
  const removeItemPrice = (index: number) => {
    if (itemPrices.length > 1) {
      setItemPrices(prev => prev.filter((_, i) => i !== index));
    }
  };

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

  const handleStudentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStudentId(e.target.value);
  };

  const handleScan = async () => {
    if (!studentId.trim()) {
      toast.error('Please enter a student ID');
      return;
    }
    
    try {
      const student = await studentService.getStudentById(studentId.trim());
      
      if (student) {
        setCurrentStudent(student);
        setIsNewStudent(false);
        toast.success(`Student found: ${student.firstName} ${student.lastName}`);
      } else {
        // Student not registered yet
        setCurrentStudent({
          id: studentId.trim(),
          firstName: '',
          lastName: '',
          course: '',
          yearLevel: '',
          isRegistered: false
        });
        setIsNewStudent(true);
        toast.warning('Student not registered. Please register them first.');
      }
    } catch (error) {
      toast.error('Error finding student.');
      console.error(error);
    }
  };

  const handleRegisterStudent = async () => {
    if (!newStudentData.firstName || !newStudentData.lastName || !newStudentData.course || !newStudentData.yearLevel) {
      toast.error('Please fill in all student information');
      return;
    }

    try {
      const registeredStudent = await studentService.createStudent({
        id: studentId.trim(),
        name: `${newStudentData.firstName} ${newStudentData.lastName}`,
        course: newStudentData.course,
        yearLevel: newStudentData.yearLevel,
        isRegistered: true
      });

      setCurrentStudent(registeredStudent);
      setIsNewStudent(false);
      toast.success('Student registered successfully!');
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.message) {
        toast.error(`Error registering student: ${error.message}`);
      } else {
        toast.error('Error registering student.');
      }
    }
  };

  const handleProcessTransaction = async () => {
    if (!currentStudent) {
      toast.error('Please enter a student ID');
      return;
    }

    if (!transactionStatus) {
      toast.error('Please select a transaction status');
      return;
    }

    // For credit transactions, transaction amount can be 0 or empty
    if (transactionStatus !== 'Credit') {
      if (!transactionAmount) {
        toast.error('Please enter a transaction amount');
        return;
      }
      
      const amount = parseFloat(transactionAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
    }

    const amount = parseFloat(transactionAmount) || 0;

    // Filter out empty item prices and convert to numbers
    const validItemPrices = itemPrices.filter(price => price.trim() !== '').map(price => parseFloat(price));
    const totalItemAmount = validItemPrices.reduce((sum, price) => sum + price, 0);

    // No need for type field since we have status

    // For credit transactions, amount should be negative (debt)
    const finalAmount = transactionStatus === 'Credit' ? -totalItemAmount : totalItemAmount;

    const transaction = {
      studentId: currentStudent.id,
      studentName: `${currentStudent.firstName} ${currentStudent.lastName}`,
      course: currentStudent.course,
      amount: finalAmount, // Negative for credit (debt), positive for paid
      transactionAmount: amount, // Keep the amount customer handed over
      itemPrices: validItemPrices,
      totalItemAmount: totalItemAmount, // Always positive - actual item value
      status: transactionStatus,
      timestamp: new Date(),
      cashier: 'Current User'
    };

    onAddTransaction(transaction);
    
    // Show appropriate success message
    if (transactionStatus === 'Credit') {
      toast.success(`Credit transaction processed: ₱${totalItemAmount.toFixed(2)} loan recorded`);
    } else {
      toast.success(`Transaction processed: ₱${totalItemAmount.toFixed(2)}`);
    }
    
    setStudentId('');
    setCurrentStudent(null);
    setTransactionAmount('');
    setItemPrices(['']);
    setTransactionStatus('');
    setIsNewStudent(false);
    setNewStudentData({ firstName: '', lastName: '', course: '', yearLevel: '' });
    
    
    inputRef.current?.focus();
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Student ID Section */}
      <Card>
        <CardHeader>
          <CardTitle>Student ID</CardTitle>
          <CardDescription>Enter student ID to begin transaction</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student-id">Student ID</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                id="student-id"
                type="text"
                placeholder="Enter student ID"
                value={studentId}
                onChange={handleStudentIdChange}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              />
              <Button onClick={handleScan} disabled={!studentId.trim()}>
                Find Student
              </Button>
            </div>
          </div>

          {/* Student Information Display */}
          {currentStudent && (
            <div className="space-y-4">
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Student Information</h3>
                  {currentStudent.isRegistered ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Registered
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <UserX className="h-3 w-3 mr-1" />
                      Not Registered
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Student ID</p>
                    <p className="font-mono">{currentStudent.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p>{currentStudent.firstName && currentStudent.lastName ? `${currentStudent.firstName} ${currentStudent.lastName}` : 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Course</p>
                    <p>{currentStudent.course || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Year Level</p>
                    <p>{currentStudent.yearLevel || 'Not set'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction/Registration Section */}
      <Card>
        {isNewStudent && (
          <CardHeader>
            <CardTitle>Register New Student</CardTitle>
            <CardDescription>
              Enter student information to register them in the system
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          {isNewStudent ? (
            
            <div className="space-y-4">
              <Alert>
                <UserX className="h-4 w-4" />
                <AlertDescription>
                  This student is not registered in the system. Please register them first.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="student-firstName">First Name</Label>
                    <Input
                      id="student-firstName"
                      placeholder="Enter first name"
                      value={newStudentData.firstName}
                      onChange={(e) => setNewStudentData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="student-lastName">Last Name</Label>
                    <Input
                      id="student-lastName"
                      placeholder="Enter last name"
                      value={newStudentData.lastName}
                      onChange={(e) => setNewStudentData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="student-course">Course</Label>
                  <div className="relative course-dropdown-container">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search and select a course..."
                        value={newStudentData.course || courseSearch}
                        onChange={(e) => {
                          setCourseSearch(e.target.value);
                          // Clear selection when user starts typing
                          if (e.target.value !== newStudentData.course) {
                            setNewStudentData(prev => ({ ...prev, course: '' }));
                          }
                        }}
                        onFocus={() => setIsCourseDropdownOpen(true)}
                        className={`pl-8 ${newStudentData.course ? 'bg-green-50 border-green-300' : ''}`}
                      />
                    </div>
                    {isCourseDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                        {filteredCourses.length > 0 ? (
                          filteredCourses.slice(0, 4).map((course) => (
                            <button
                              key={course}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Course selected:', course);
                                setNewStudentData(prev => ({ ...prev, course: course }));
                                setCourseSearch('');
                                setIsCourseDropdownOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                            >
                              {course}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500">No courses found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="student-year">Year Level</Label>
                  <Select
                    value={newStudentData.yearLevel}
                    onValueChange={(value) => setNewStudentData(prev => ({ ...prev, yearLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year level" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_LEVELS.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button onClick={handleRegisterStudent} className="w-full">
                Register Student
              </Button>
            </div>
          ) : (
            
            <div className="space-y-4">
              {/* Header with Change Counter */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Process Transaction</h3>
                  <p className="text-sm text-gray-600">Enter transaction amount and process payment</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border w-32 h-20 flex flex-col justify-center mt-2">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">Change</div>
                    <div className={`text-2xl font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₱{change.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Transaction Amount (₱)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  disabled={!currentStudent?.isRegistered}
                />
              </div>

              {/* Item Prices */}
              <div className="space-y-2">
                <Label>Item Prices (₱)</Label>
                <div className="space-y-2">
                  {itemPrices.map((price, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={price}
                        onChange={(e) => updateItemPrice(index, e.target.value)}
                        disabled={!currentStudent?.isRegistered}
                        className={`flex-1 ${price && parseFloat(price) > 0 ? 'text-green-500' : ''}`}
                      />
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItemPrice(index)}
                          disabled={!currentStudent?.isRegistered}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </Button>
                      )}
                      {index === itemPrices.length - 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addItemPrice}
                          disabled={!currentStudent?.isRegistered}
                          className="px-2"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {totalItemPrices > 0 && (
                  <div className="text-sm text-gray-600">
                    Total Item Prices: ₱{totalItemPrices.toFixed(2)}
                  </div>
                )}
              </div>

              {/* Transaction Status */}
              <div className="space-y-2">
                <Label>Transaction Status</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={transactionStatus === 'Paid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTransactionStatus('Paid')}
                    disabled={!currentStudent?.isRegistered}
                    className={transactionStatus === 'Paid' ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    Paid
                  </Button>
                  <Button
                    type="button"
                    variant={transactionStatus === 'Partial' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTransactionStatus('Partial')}
                    disabled={!currentStudent?.isRegistered}
                    className={transactionStatus === 'Partial' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                  >
                    Partial
                  </Button>
                  <Button
                    type="button"
                    variant={transactionStatus === 'Credit' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTransactionStatus('Credit')}
                    disabled={!currentStudent?.isRegistered}
                    className={transactionStatus === 'Credit' ? 'bg-red-500 hover:bg-red-600' : ''}
                  >
                    Credit
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleProcessTransaction}
                disabled={!currentStudent?.isRegistered || !transactionStatus || totalItemPrices === 0 || (change < 0 && transactionStatus !== 'Credit') || (transactionStatus !== 'Credit' && !transactionAmount)}
                className="w-full"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Process Transaction
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}