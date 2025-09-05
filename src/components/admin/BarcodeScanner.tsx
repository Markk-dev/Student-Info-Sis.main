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
  loyalty?: number;
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

  // Dynamic status button disabling logic with loyalty restrictions
  const studentLoyalty = currentStudent?.loyalty || 0;
  const isPaidDisabled = !currentStudent?.isRegistered || totalItemPrices === 0 || transactionAmountNum < totalItemPrices;
  const isPartialDisabled = !currentStudent?.isRegistered || totalItemPrices === 0 || transactionAmountNum >= totalItemPrices || transactionAmountNum === 0 || studentLoyalty < 90;
  const isCreditDisabled = !currentStudent?.isRegistered || totalItemPrices === 0 || transactionAmountNum > 0 || studentLoyalty < 100;

  // Auto-select appropriate status based on conditions and loyalty restrictions
  useEffect(() => {
    if (!currentStudent?.isRegistered || totalItemPrices === 0) {
      setTransactionStatus('');
      return;
    }

    const studentLoyalty = currentStudent?.loyalty || 0;

    if (transactionAmountNum === 0) {
      // No transaction amount = Credit (only if loyalty >= 100)
      if (studentLoyalty >= 100) {
        setTransactionStatus('Credit');
      } else {
        setTransactionStatus('');
      }
    } else if (transactionAmountNum >= totalItemPrices) {
      // Sufficient amount = Paid (always available)
      setTransactionStatus('Paid');
    } else if (transactionAmountNum < totalItemPrices) {
      // Insufficient amount = Partial (only if loyalty >= 90)
      if (studentLoyalty >= 90) {
        setTransactionStatus('Partial');
      } else {
        setTransactionStatus('');
      }
    }
  }, [transactionAmountNum, totalItemPrices, currentStudent?.isRegistered, currentStudent?.loyalty]);

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
      // Get full student data including loyalty points
      const studentsResponse = await studentService.getStudents();
      const fullStudent = studentsResponse.documents.find((s: any) => s.studentId === studentId.trim());

      if (fullStudent) {
        const student = {
          id: fullStudent.studentId,
          firstName: fullStudent.firstName,
          lastName: fullStudent.lastName,
          course: fullStudent.course,
          yearLevel: fullStudent.yearLevel,
          loyalty: fullStudent.loyalty || 0,
          isRegistered: true
        };
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
          loyalty: 0,
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

    // Filter out empty item prices and convert to numbers
    const validItemPrices = itemPrices.filter(price => price.trim() !== '').map(price => parseFloat(price));
    const totalItemAmount = validItemPrices.reduce((sum, price) => sum + price, 0);

    if (totalItemAmount <= 0) {
      toast.error('Please enter valid item prices');
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

    // Calculate final amount based on status
    let finalAmount: number;
    if (transactionStatus === 'Credit') {
      // For credit transactions, amount should be negative (debt)
      finalAmount = -totalItemAmount;
    } else if (transactionStatus === 'Partial') {
      // For partial transactions, record the remaining balance (negative)
      finalAmount = amount - totalItemAmount;
    } else {
      // For paid transactions, record the total item amount
      finalAmount = totalItemAmount;
    }

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
    } else if (transactionStatus === 'Partial') {
      const remainingBalance = totalItemAmount - amount;
      toast.success(`Partial transaction processed: ₱${amount.toFixed(2)} paid, ₱${remainingBalance.toFixed(2)} remaining`);
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Student ID Section */}
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Student ID</CardTitle>
          <CardDescription className="text-xs">Enter student ID to begin transaction</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <div className="space-y-1.5">
            <Label htmlFor="student-id" className="text-sm">Student ID</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                id="student-id"
                type="text"
                placeholder="Enter student ID"
                value={studentId}
                onChange={handleStudentIdChange}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                className="h-9"
              />
              <Button onClick={handleScan} disabled={!studentId.trim()} size="sm">
                Find
              </Button>
            </div>
          </div>

          {/* Student Information Display */}
          {currentStudent && (
            <div className="space-y-3 pt-2">
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Student Information</h3>
                  {currentStudent.isRegistered ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Registered
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <UserX className="h-3 w-3 mr-1" />
                      Not Registered
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">ID</p>
                    <p className="font-mono">{currentStudent.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="truncate">{currentStudent.firstName && currentStudent.lastName ? `${currentStudent.firstName} ${currentStudent.lastName}` : 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Course</p>
                    <p>{currentStudent.course || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Year</p>
                    <p>{currentStudent.yearLevel || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Loyalty Points</p>
                    <div className="flex items-center gap-1">
                      <p className={`font-semibold ${(currentStudent.loyalty || 0) >= 100 ? 'text-gold-600' :
                        (currentStudent.loyalty || 0) >= 90 ? 'text-blue-600' :
                          (currentStudent.loyalty || 0) >= 50 ? 'text-green-600' : 'text-gray-600'
                        }`}>
                        {currentStudent.loyalty || 0}/100
                      </p>
                      {(currentStudent.loyalty || 0) >= 100 && (
                        <Badge variant="default" className="bg-yellow-100 text-yellow-800 text-xs px-1 py-0">
                          MAX
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment Access</p>
                    <div className="flex gap-1">
                      {(currentStudent.loyalty || 0) >= 100 && (
                        <Badge variant="default" className="bg-red-100 text-red-800 text-xs px-1 py-0">
                          Credit
                        </Badge>
                      )}
                      {(currentStudent.loyalty || 0) >= 90 && (
                        <Badge variant="default" className="bg-yellow-100 text-yellow-800 text-xs px-1 py-0">
                          Partial
                        </Badge>
                      )}
                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs px-1 py-0">
                        Paid
                      </Badge>
                    </div>
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
          <CardHeader className="p-4">
            <CardTitle className="text-base">Register New Student</CardTitle>
            <CardDescription className="text-xs">
              Enter student information to register them.
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className="space-y-3 p-4">
          {isNewStudent ? (

            <div className="space-y-3">
              <Alert>
                <UserX className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  This student is not registered. Please register them first.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="student-firstName" className="text-xs">First Name</Label>
                    <Input
                      id="student-firstName"
                      placeholder="First name"
                      value={newStudentData.firstName}
                      onChange={(e) => setNewStudentData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label htmlFor="student-lastName" className="text-xs">Last Name</Label>
                    <Input
                      id="student-lastName"
                      placeholder="Last name"
                      value={newStudentData.lastName}
                      onChange={(e) => setNewStudentData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="student-course" className="text-xs">Course</Label>
                  <div className="relative course-dropdown-container">
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
                        className={`pl-7 h-9 text-xs ${newStudentData.course ? 'bg-green-50 border-green-300' : ''}`}
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
                              className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                            >
                              {course}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-1.5 text-xs text-gray-500">No courses found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="student-year" className="text-xs">Year Level</Label>
                  <Select
                    value={newStudentData.yearLevel}
                    onValueChange={(value) => setNewStudentData(prev => ({ ...prev, yearLevel: value }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select year level" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_LEVELS.map((year) => (
                        <SelectItem key={year} value={year} className="text-xs">{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleRegisterStudent} className="w-full" size="sm">
                Register Student
              </Button>
            </div>
          ) : (

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">Process Transaction</h3>
                  <p className="text-xs text-gray-600">Enter amounts and process payment</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg border w-28">
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-0.5">Change</div>
                    <div className={`text-xl font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₱{change.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-sm">Amount Paid (₱)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  disabled={!currentStudent?.isRegistered}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Item Prices (₱)</Label>
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
                        className={`flex-1 h-9 ${price && parseFloat(price) > 0 ? 'text-green-500' : ''}`}
                      />
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeItemPrice(index)}
                          disabled={!currentStudent?.isRegistered}
                          className="text-red-500 hover:text-red-700 h-8 w-8"
                        >
                          ×
                        </Button>
                      )}
                      {index === itemPrices.length - 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={addItemPrice}
                          disabled={!currentStudent?.isRegistered}
                          className="h-8 w-8"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {totalItemPrices > 0 && (
                  <div className="text-xs text-gray-600">
                    Total Item Price: ₱{totalItemPrices.toFixed(2)}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Status</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={transactionStatus === 'Paid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTransactionStatus('Paid')}
                    disabled={isPaidDisabled}
                    className={`text-xs ${transactionStatus === 'Paid' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                  >
                    Paid
                  </Button>
                  <Button
                    type="button"
                    variant={transactionStatus === 'Partial' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTransactionStatus('Partial')}
                    disabled={isPartialDisabled}
                    className={`text-xs ${transactionStatus === 'Partial' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
                    title={studentLoyalty < 90 ? 'Requires 90+ loyalty points' : ''}
                  >
                    Partial
                    {studentLoyalty < 90 && <span className="ml-1 text-xs">🔒</span>}
                  </Button>
                  <Button
                    type="button"
                    variant={transactionStatus === 'Credit' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTransactionStatus('Credit')}
                    disabled={isCreditDisabled}
                    className={`text-xs ${transactionStatus === 'Credit' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                    title={studentLoyalty < 100 ? 'Requires 100 loyalty points' : ''}
                  >
                    Credit
                    {studentLoyalty < 100 && <span className="ml-1 text-xs">🔒</span>}
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleProcessTransaction}
                disabled={!currentStudent?.isRegistered || !transactionStatus || totalItemPrices === 0 || (change < 0 && transactionStatus !== 'Credit' && transactionStatus !== 'Partial') || (transactionStatus !== 'Credit' && transactionStatus !== 'Partial' && !transactionAmount)}
                className="w-full"
                size="sm"
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