import { useState, useRef, useEffect, useCallback } from 'react';
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

  
  const filteredCourses = COURSES.filter(course =>
    course.toLowerCase().includes(courseSearch.toLowerCase())
  );

  
  const totalItemPrices = itemPrices.reduce((sum, price) => {
    const numPrice = parseFloat(price) || 0;
    return sum + numPrice;
  }, 0);

  
  const transactionAmountNum = parseFloat(transactionAmount) || 0;
  const change = transactionAmountNum - totalItemPrices;

  
  const studentLoyalty = currentStudent?.loyalty || 0;
  const isPaidDisabled = !currentStudent?.isRegistered || totalItemPrices === 0 || transactionAmountNum < totalItemPrices;
  const isPartialDisabled = !currentStudent?.isRegistered || totalItemPrices === 0 || transactionAmountNum >= totalItemPrices || transactionAmountNum === 0 || studentLoyalty < 90;
  const isCreditDisabled = !currentStudent?.isRegistered || totalItemPrices === 0 || transactionAmountNum > 0 || studentLoyalty < 100;

  
  useEffect(() => {
    if (!currentStudent?.isRegistered || totalItemPrices === 0) {
      setTransactionStatus('');
      return;
    }

    const studentLoyalty = currentStudent?.loyalty || 0;

    if (transactionAmountNum === 0) {
      
      if (studentLoyalty >= 100) {
        setTransactionStatus('Credit');
      } else {
        setTransactionStatus('');
      }
    } else if (transactionAmountNum >= totalItemPrices) {
      
      setTransactionStatus('Paid');
    } else if (transactionAmountNum < totalItemPrices) {
      
      if (studentLoyalty >= 90) {
        setTransactionStatus('Partial');
      } else {
        setTransactionStatus('');
      }
    }
  }, [transactionAmountNum, totalItemPrices, currentStudent?.isRegistered, currentStudent?.loyalty]);

  
  const addItemPrice = () => {
    setItemPrices(prev => [...prev, '']);
  };

  
  const updateItemPrice = (index: number, value: string) => {
    setItemPrices(prev => prev.map((price, i) => i === index ? value : price));
  };

  
  const removeItemPrice = (index: number) => {
    if (itemPrices.length > 1) {
      setItemPrices(prev => prev.filter((_, i) => i !== index));
    }
  };

  
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

  const handleScan = useCallback(async (manualId?: string) => {
    const id = (manualId || studentId).trim();
    
    if (!id) {
      toast.error('Please enter a student ID');
      return;
    }

    try {
      // Get full student data including loyalty points
      const studentsResponse = await studentService.getStudents();
      const fullStudent = studentsResponse.documents.find((s: any) => s.studentId === id);

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
        // Clear input and refocus for next barcode scan
        setTimeout(() => {
          setStudentId('');
          inputRef.current?.focus();
        }, 300);
      } else {
        // Student not registered yet
        setCurrentStudent({
          id: id,
          firstName: '',
          lastName: '',
          course: '',
          yearLevel: '',
          loyalty: 0,
          isRegistered: false
        });
        setIsNewStudent(true);
        toast.warning('Student not registered. Please register them first.');
        // Clear input and refocus
        setTimeout(() => {
          setStudentId('');
          inputRef.current?.focus();
        }, 500);
      }
    } catch (error) {
      toast.error('Error finding student.');
      console.error(error);
    }
  }, [studentId]);


  
  useEffect(() => {
    
    const focusInput = () => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    };
    
    
    const timer = setTimeout(focusInput, 100);
    
    
    const handleFocusLoss = () => {
      
      setTimeout(() => {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          focusInput();
        }
      }, 100);
    };
    
    
    window.addEventListener('focus', focusInput);
    document.addEventListener('click', handleFocusLoss);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', focusInput);
      document.removeEventListener('click', handleFocusLoss);
    };
  }, []);

  
  
  // Handle Enter key in input field (for manual entry)
  const handleBarcodeInput = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const scannedValue = studentId.trim();
      if (scannedValue) {
        console.log('Enter pressed manually - searching for:', scannedValue);
        handleScan(scannedValue);
      }
    }
  }, [studentId, handleScan]);

  const handleRegisterStudent = async () => {
    if (!newStudentData.firstName || !newStudentData.lastName || !newStudentData.course || !newStudentData.yearLevel) {
      toast.error('Please fill in all student information');
      return;
    }

    // Use currentStudent.id if available, otherwise fall back to studentId
    const studentIdToUse = currentStudent?.id || studentId.trim();
    
    if (!studentIdToUse) {
      toast.error('Student ID is required');
      return;
    }

    try {
      const registeredStudent = await studentService.createStudent({
        id: studentIdToUse,
        name: `${newStudentData.firstName} ${newStudentData.lastName}`,
        course: newStudentData.course,
        yearLevel: newStudentData.yearLevel,
        isRegistered: true
      });

      setCurrentStudent({
        id: registeredStudent.id,
        firstName: registeredStudent.firstName,
        lastName: registeredStudent.lastName,
        course: registeredStudent.course,
        yearLevel: registeredStudent.yearLevel,
        loyalty: 25, // New students get 25 loyalty points
        isRegistered: true
      });
      setIsNewStudent(false);
      toast.success('Student registered successfully!');
      
      // Clear registration form
      setNewStudentData({ firstName: '', lastName: '', course: '', yearLevel: '' });
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

    
    const validItemPrices = itemPrices.filter(price => price.trim() !== '').map(price => parseFloat(price));
    const totalItemAmount = validItemPrices.reduce((sum, price) => sum + price, 0);

    if (totalItemAmount <= 0) {
      toast.error('Please enter valid item prices');
      return;
    }

    
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

    
    let finalAmount: number;
    if (transactionStatus === 'Credit') {
      
      finalAmount = -totalItemAmount;
    } else if (transactionStatus === 'Partial') {
      
      finalAmount = amount - totalItemAmount;
    } else {
      
      finalAmount = totalItemAmount;
    }

    const transaction = {
      studentId: currentStudent.id,
      studentName: `${currentStudent.firstName} ${currentStudent.lastName}`,
      course: currentStudent.course,
      amount: finalAmount, 
      transactionAmount: amount, 
      itemPrices: validItemPrices,
      totalItemAmount: totalItemAmount, 
      status: transactionStatus,
      timestamp: new Date(),
      cashier: 'Current User'
    };

    onAddTransaction(transaction);

    
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


  // Global key buffer listener for barcode scanner
  // This bypasses React re-renders by collecting the full barcode before triggering any state updates
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      
      // Reset buffer if typing is slow (manual input)
      // Barcode scanners send data very quickly (< 100ms between keys)
      if (now - lastKeyTime > 100) {
        buffer = '';
      }

      // Capture numeric characters (most barcodes are numeric)
      // You can expand to /^[0-9a-zA-Z]$/ if you need alphanumeric
      if (/^[0-9a-zA-Z]$/.test(e.key)) {
        buffer += e.key;
        console.log('Buffer:', buffer, '| Time gap:', now - lastKeyTime, 'ms');
      }

      // Scanners usually send Enter at the end
      if (e.key === 'Enter' && buffer.length >= 3) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('✅ Full barcode scanned:', buffer, '| Length:', buffer.length);
        
        // Only NOW do we update React state - after the full barcode is captured
        setStudentId(buffer);
        handleScan(buffer); // directly trigger your existing scan logic
        
        buffer = '';
      }

      lastKeyTime = now;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScan]);

  // Handle manual input changes (for typing in the input field)
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStudentId(value);
  }, []);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-1">
        {/* Student ID Section */}
        <Card>
          <CardContent className="space-y-3 p-4 pt-3">
            {/* Manual ID Search */}
            <div className="space-y-2">
              <Label htmlFor="student-id" className="text-sm">Manual ID Search</Label>
              <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    id="student-id"
                    type="text"
                    placeholder="Scan barcode or enter Student ID"
                    value={studentId}
                    onChange={handleInputChange}
                    onKeyDown={handleBarcodeInput}
                    className="h-9 w-full border-2 border-green-500 focus:border-green-600"
                    autoFocus
                    autoComplete="off"
                  />
                  <Button onClick={() => handleScan()} disabled={!studentId.trim()} size="sm">
                    Find
                  </Button>
                </div>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Scanner ready - Scan barcode now
                </p>
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
                    {studentLoyalty < 90 && <span className="ml-1 text-xs"></span>}
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
                    {studentLoyalty < 100 && <span className="ml-1 text-xs"></span>}
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