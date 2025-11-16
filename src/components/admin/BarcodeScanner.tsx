import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, UserX, ShoppingCart, Search, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { studentService } from '@/lib/services';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  course: string;
  yearLevel: string;
  loyalty?: number;
  token?: number; // Cash/token balance
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
  const [isSearching, setIsSearching] = useState(false);
  const [addTokenMode, setAddTokenMode] = useState(false);
  const [payWithToken, setPayWithToken] = useState(false);
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(5);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerProcessedRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingTokenRef = useRef(false);


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

  // In addTokenMode, only Paid is allowed and item prices are disabled
  const isPaidDisabled = addTokenMode
    ? (!currentStudent?.isRegistered || transactionAmountNum <= 0)
    : (!currentStudent?.isRegistered || totalItemPrices === 0 || transactionAmountNum < totalItemPrices);
  const isPartialDisabled = addTokenMode
    ? true // Disabled in addTokenMode
    : (!currentStudent?.isRegistered || totalItemPrices === 0 || transactionAmountNum >= totalItemPrices || transactionAmountNum === 0 || studentLoyalty < 90);
  const isCreditDisabled = addTokenMode
    ? true // Disabled in addTokenMode
    : (!currentStudent?.isRegistered || totalItemPrices === 0 || transactionAmountNum > 0 || studentLoyalty < 100);


  useEffect(() => {
    // In addTokenMode, automatically set to Paid when amount is entered
    if (addTokenMode) {
      if (transactionAmountNum > 0) {
        setTransactionStatus('Paid');
      } else {
        setTransactionStatus('');
      }
      return;
    }

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
  }, [transactionAmountNum, totalItemPrices, currentStudent?.isRegistered, currentStudent?.loyalty, addTokenMode]);


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

  const handleScan = useCallback(async (searchId?: string) => {
    const id = (searchId || studentId).trim();

    if (!id || id.length < 6) {
      // If search is too short (less than 6 digits), clear current student
      setCurrentStudent(null);
      setIsNewStudent(false);
      return;
    }

    setIsSearching(true);
    try {
      // Get full student data including loyalty points
      const studentsResponse = await studentService.getStudents();
      // First try exact match, then try starts with match
      const fullStudent = studentsResponse.documents.find((s: any) =>
        s.studentId && s.studentId.toString() === id
      ) || studentsResponse.documents.find((s: any) =>
        s.studentId && s.studentId.toString().startsWith(id)
      );

      if (fullStudent) {
        const student = {
          id: fullStudent.studentId,
          firstName: fullStudent.firstName,
          lastName: fullStudent.lastName,
          course: fullStudent.course,
          yearLevel: fullStudent.yearLevel,
          loyalty: fullStudent.loyalty || 0,
          token: fullStudent.token || fullStudent.cash || 0, // Support both token and cash field names
          isRegistered: true
        };
        setCurrentStudent(student);
        setIsNewStudent(false);
      } else {
        // Student not registered yet - check if we have a complete ID (6+ digits)
        if (id.length >= 6) {
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
        } else {
          // Still typing, don't show as new student yet
          setCurrentStudent(null);
          setIsNewStudent(false);
        }
      }
    } catch (error) {
      console.error('Error finding student:', error);
      setCurrentStudent(null);
    } finally {
      setIsSearching(false);
    }
  }, [studentId]);

  // Dynamic search as user types (debounced)
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If input is empty or too short (less than 6 digits), clear student
    if (!studentId.trim() || studentId.trim().length < 6) {
      setCurrentStudent(null);
      setIsNewStudent(false);
      return;
    }

    // Debounce the search - wait 300ms after user stops typing
    // Only searches when 6+ digits are entered to limit database polling
    searchTimeoutRef.current = setTimeout(() => {
      handleScan(studentId);
    }, 300);

    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [studentId, handleScan]);

  // Cleanup countdown interval on unmount or when addTokenMode changes
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  // Reset countdown when addTokenMode is disabled
  useEffect(() => {
    if (!addTokenMode && isAddingToken) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setIsAddingToken(false);
      setCountdownSeconds(5);
      isProcessingTokenRef.current = false; // Reset processing flag
    }
  }, [addTokenMode, isAddingToken]);


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



  // Handle Enter key in input field (for manual entry only)
  // Note: Barcode scanner Enter is handled by the global listener above
  const handleBarcodeInput = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Skip if scanner just processed this
      if (scannerProcessedRef.current) {
        return;
      }

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

  // Cancel add token operation
  const cancelAddToken = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setIsAddingToken(false);
    setCountdownSeconds(5);
    isProcessingTokenRef.current = false; // Reset processing flag
    toast.dismiss(); // Dismiss any existing toasts
    toast.info('Operation canceled');
  };

  // Actually process the add token (called after countdown)
  const processAddToken = async () => {
    // Prevent duplicate processing
    if (isProcessingTokenRef.current) {
      return;
    }

    if (!currentStudent || !transactionAmount) {
      return;
    }

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    // Set processing flag
    isProcessingTokenRef.current = true;

    const transaction = {
      studentId: currentStudent.id,
      studentName: `${currentStudent.firstName} ${currentStudent.lastName}`,
      course: currentStudent.course,
      amount: amount, // Positive amount for adding token/cash
      transactionAmount: amount,
      itemPrices: [],
      totalItemAmount: amount, // Show the total amount processed
      status: 'Bought Token', // Changed from 'Paid' to 'Bought Token'
      tokenOperation: 'add', // Indicate this is adding token
      cash: amount, // Database field name is "cash"
      timestamp: new Date(),
      cashier: 'Current User'
    };

    // Update student's cash balance in database
    try {
      const currentCash = currentStudent.token || 0;
      const newCashBalance = currentCash + amount;
      await studentService.updateStudent(currentStudent.id, {
        cash: newCashBalance
      });

      // Update local state to reflect the change
      setCurrentStudent({
        ...currentStudent,
        token: newCashBalance
      });
    } catch (error) {
      console.error('Error updating student cash balance:', error);
      toast.dismiss(); // Dismiss any existing toasts
      toast.error('Failed to update cash balance');
      setIsAddingToken(false);
      setCountdownSeconds(5);
      isProcessingTokenRef.current = false; // Reset processing flag
      return;
    }

    // Only show the token added toast, not the transaction processed toast
    // We'll pass a flag to prevent the parent from showing duplicate toast
    toast.dismiss(); // Dismiss any existing toasts
    onAddTransaction({ ...transaction, skipTransactionToast: true });
    toast.success(`Token added: ₱${amount.toFixed(2)} added to account`);

    // Reset
    setIsAddingToken(false);
    setCountdownSeconds(5);
    isProcessingTokenRef.current = false; // Reset processing flag
    setStudentId('');
    setCurrentStudent(null);
    setTransactionAmount('');
    setItemPrices(['']);
    setTransactionStatus('');
    setAddTokenMode(false);
    setIsNewStudent(false);
    setNewStudentData({ firstName: '', lastName: '', course: '', yearLevel: '' });
    inputRef.current?.focus();
  };

  const handleProcessTransaction = async () => {
    if (!currentStudent) {
      toast.error('Please enter a student ID');
      return;
    }

    // Handle Add Token Mode with countdown
    if (addTokenMode) {
      if (!transactionAmount) {
        toast.error('Please enter an amount to add');
        return;
      }

      const amount = parseFloat(transactionAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      // Start countdown
      setIsAddingToken(true);
      setCountdownSeconds(5);

      countdownIntervalRef.current = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            // Countdown finished, process the add token
            processAddToken();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);

      return;
    }

    // Normal transaction processing
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

    const amount = parseFloat(transactionAmount) || 0;

    // Handle Pay with Token
    if (payWithToken) {
      const currentToken = currentStudent.token || 0;

      // Check if token is sufficient
      if (currentToken <= 0) {
        // Check if loyalty points allow Partial/Credit
        if (transactionStatus === 'Partial' && studentLoyalty >= 90) {
          // Allow Partial with loyalty points
        } else if (transactionStatus === 'Credit' && studentLoyalty >= 100) {
          // Allow Credit with loyalty points
        } else {
          toast.dismiss(); // Dismiss any existing toasts
          toast.error('Insufficient token');
          return;
        }
      } else if (currentToken < totalItemAmount) {
        // Token not enough - check if loyalty points allow Partial/Credit
        if (transactionStatus === 'Partial' && studentLoyalty >= 90) {
          // Allow Partial - use available token + loyalty
          toast.dismiss(); // Dismiss any existing toasts
          toast.warning(`Insufficient token. Using ₱${currentToken.toFixed(2)} token + loyalty points for partial payment`);
        } else if (transactionStatus === 'Credit' && studentLoyalty >= 100) {
          // Allow Credit - use available token + loyalty
          toast.dismiss(); // Dismiss any existing toasts
          toast.warning(`Insufficient token. Using ₱${currentToken.toFixed(2)} token + loyalty points for credit`);
        } else {
          toast.dismiss(); // Dismiss any existing toasts
          toast.error('Insufficient token');
          return;
        }
      } else {
        // Token is sufficient
        toast.dismiss(); // Dismiss any existing toasts
        toast.success(`Using ₱${Math.min(currentToken, totalItemAmount).toFixed(2)} token for payment`);
      }
    }

    // Calculate final amount
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
      status: payWithToken && transactionStatus === 'Paid' ? 'Paid (Token)' : transactionStatus,
      payWithToken: payWithToken,
      tokenUsed: payWithToken ? Math.min(currentStudent.token || 0, totalItemAmount) : 0,
      cash: payWithToken ? -Math.min(currentStudent.token || 0, totalItemAmount) : 0, // Database field name is "cash" (negative for deduction)
      timestamp: new Date(),
      cashier: 'Current User'
    };

    // Update student's cash balance if paying with token
    if (payWithToken) {
      try {
        const currentCash = currentStudent.token || 0;
        const tokenToDeduct = Math.min(currentCash, totalItemAmount);
        const newCashBalance = currentCash - tokenToDeduct;
        await studentService.updateStudent(currentStudent.id, {
          cash: newCashBalance
        });

        // Update local state to reflect the change
        setCurrentStudent({
          ...currentStudent,
          token: newCashBalance
        });
      } catch (error) {
        console.error('Error updating student cash balance:', error);
        toast.dismiss(); // Dismiss any existing toasts
        toast.error('Failed to update cash balance');
      }
    }

    toast.dismiss(); // Dismiss any existing toasts before showing new one
    onAddTransaction(transaction);

    // Success messages
    if (transactionStatus === 'Credit') {
      toast.success(`Credit transaction processed: ₱${totalItemAmount.toFixed(2)} loan recorded`);
    } else if (transactionStatus === 'Partial') {
      const remainingBalance = totalItemAmount - amount;
      toast.success(`Partial transaction processed: ₱${amount.toFixed(2)} paid, ₱${remainingBalance.toFixed(2)} remaining`);
    } else {
      toast.success(`Transaction processed: ₱${totalItemAmount.toFixed(2)}`);
    }

    // Reset
    setStudentId('');
    setCurrentStudent(null);
    setTransactionAmount('');
    setItemPrices(['']);
    setTransactionStatus('');
    setPayWithToken(false);
    setAddTokenMode(false);
    setIsNewStudent(false);
    setNewStudentData({ firstName: '', lastName: '', course: '', yearLevel: '' });

    inputRef.current?.focus();
  };


  // Global key buffer listener for barcode scanner
  // This bypasses React re-renders by collecting the full barcode before triggering any state updates
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();
    let firstKeyTime = Date.now(); // Track when buffer started
    let keyTimes: number[] = []; // Track timing of all keys in sequence

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTime;

      // Capture alphanumeric characters
      if (/^[0-9a-zA-Z]$/.test(e.key)) {
        // If this is the first character, record the start time
        if (buffer.length === 0) {
          firstKeyTime = now;
        }

        buffer += e.key;
        // Only track timing if this isn't the first key (first key has no previous time)
        if (buffer.length > 1) {
          keyTimes.push(timeSinceLastKey);
        }

        // If we're building a buffer and keys are coming fast, prevent input field from updating
        // This helps ensure the buffer is used instead of the input field value
        if (buffer.length > 0 && timeSinceLastKey < 100) {
          // Don't prevent default here, but we'll handle it on Enter
        }

        console.log('Buffer:', buffer, '| Time gap:', timeSinceLastKey, 'ms');
      }

      // Reset buffer if typing is slow (manual input) - but only if we have a buffer
      // Only reset if there's a significant pause (more than 500ms) and it's not Enter
      if (timeSinceLastKey > 500 && buffer.length > 0 && e.key !== 'Enter') {
        console.log('Slow typing detected - resetting buffer');
        buffer = '';
        keyTimes = [];
        firstKeyTime = Date.now();
      }

      // Scanners usually send Enter at the end
      if (e.key === 'Enter') {
        // Use buffer if available, otherwise fall back to input field value
        const valueToSearch = buffer.length >= 6 ? buffer : (inputRef.current?.value?.trim() || '');

        if (valueToSearch.length >= 6) {
          // Check total time for the entire sequence (if we have a buffer)
          const totalTime = buffer.length > 0 ? (now - firstKeyTime) : 0;
          const timePerChar = buffer.length > 0 ? (totalTime / buffer.length) : 0;

          // Calculate average time between keys
          const avgTime = keyTimes.length > 0
            ? keyTimes.reduce((sum, t) => sum + t, 0) / keyTimes.length
            : Infinity;

          // ULTRA AGGRESSIVE DETECTION: 
          // Auto-search on ANY Enter press with a valid value UNLESS it's obviously very slow typing
          // Most barcode scanners complete in < 1 second, so anything reasonable should auto-search
          // Only exclude if it took more than 10 seconds (clearly manual typing with pauses)
          const isVerySlowTyping = totalTime > 10000;

          // Auto-search for anything that's not obviously very slow
          if (!isVerySlowTyping) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation(); // Stop all other handlers

            console.log('✅ Barcode scanned - Auto searching:', valueToSearch, '| Buffer length:', buffer.length, '| Total time:', totalTime, 'ms', '| Avg time:', avgTime.toFixed(2), 'ms', '| Time per char:', timePerChar.toFixed(2), 'ms');

            // Mark that we processed a scanner scan IMMEDIATELY
            scannerProcessedRef.current = true;

            // Update state with the scanned value
            setStudentId(valueToSearch);

            // Immediately search - use the value directly (bypasses debounce)
            handleScan(valueToSearch);

            // Reset the flag after a delay
            setTimeout(() => {
              scannerProcessedRef.current = false;
            }, 500);

            // Reset everything
            buffer = '';
            keyTimes = [];
            firstKeyTime = Date.now();
            lastKeyTime = Date.now();
            return;
          } else {
            console.log('Very slow typing detected - not auto-searching. Total time:', totalTime, 'ms', '| Avg time:', avgTime.toFixed(2), 'ms');
          }
        }

        // If Enter is pressed but it's manual typing or no valid value, let the normal handler deal with it
        // Reset buffer for next time
        buffer = '';
        keyTimes = [];
        firstKeyTime = Date.now();
      }

      lastKeyTime = now;
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase for better detection
    return () => window.removeEventListener('keydown', handleKeyDown, true);
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
          <div className=' flex flex-col gap-3 p-2'>
            <div className="space-y-2">
              <Label htmlFor="student-id" className="text-sm">Student ID Search</Label>
              <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    id="student-id"
                    type="text"
                    inputMode="numeric"
                    placeholder="Type or scan Student ID (searches automatically)"
                    value={studentId}
                    onChange={handleInputChange}
                    onKeyDown={handleBarcodeInput}
                    onBlur={() => {
                      // On mobile, blur the input to dismiss keyboard when user taps elsewhere
                      if (window.innerWidth <= 768) {
                        setTimeout(() => {
                          if (document.activeElement !== inputRef.current) {
                            inputRef.current?.blur();
                          }
                        }, 100);
                      }
                    }}
                    className="h-9 w-full border-2 border-green-500 focus:border-green-600"
                    autoFocus
                    autoComplete="off"
                  />
                  <Button
                    onClick={() => {
                      setStudentId('');
                      setCurrentStudent(null);
                      setIsNewStudent(false);
                      inputRef.current?.focus();
                    }}
                    disabled={!studentId.trim()}
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 p-0"
                    title="Clear field"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isSearching ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
                  {isSearching ? 'Searching...' : studentId.length >= 6 ? 'Searching as you type...' : studentId.length > 0 ? `Type ${6 - studentId.length} more digit${6 - studentId.length > 1 ? 's' : ''} to search` : 'Type or scan Student ID (6+ digits)'}
                </p>
              </div>
            </div>

            <div className='bg-blue-300'>

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

              {/* Token Management Section */}
              {currentStudent.isRegistered && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Button
                        onClick={() => {
                          setAddTokenMode(!addTokenMode);
                          if (!addTokenMode) {
                            setPayWithToken(false);
                            setItemPrices(['']);
                            setTransactionAmount('');
                            setTransactionStatus('');
                          }
                        }}
                        variant={addTokenMode ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs"
                        disabled={!currentStudent.isRegistered || isAddingToken}
                      >
                        {addTokenMode ? 'Cancel Buy Token' : 'Buy Token'}
                      </Button>
                      <Button
                        onClick={() => {
                          setPayWithToken(!payWithToken);
                          if (!payWithToken) {
                            setAddTokenMode(false);
                          }
                        }}
                        variant={payWithToken ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs"
                        disabled={!currentStudent.isRegistered || addTokenMode}
                      >
                        {payWithToken ? 'Cancel Pay with Token' : 'Pay with Token'}
                      </Button>
                    </div>
                    {addTokenMode}
                    {payWithToken}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>


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
                {!addTokenMode && (
                  <div className="bg-gray-50 p-2 rounded-lg border w-28">
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-0.5">Change</div>
                      <div className={`text-xl font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₱{change.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!addTokenMode && (
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
              )}

              <div className="space-y-1.5">
                <Label className="text-sm">
                  {addTokenMode ? 'Amount to Add (₱)' : 'Item Prices (₱)'}
                </Label>
                {addTokenMode ? (
                  <div className="space-y-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                      disabled={!currentStudent?.isRegistered || isAddingToken}
                      className="h-9"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the amount of token you wish to add
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {itemPrices.map((price, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={price}
                          onChange={(e) => updateItemPrice(index, e.target.value)}
                          disabled={!currentStudent?.isRegistered || addTokenMode}
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
                    {totalItemPrices > 0 && (
                      <div className="text-xs text-gray-600">
                        Total Item Price: ₱{totalItemPrices.toFixed(2)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!addTokenMode && (
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
              )}

              <div className="relative w-full overflow-hidden rounded-md">
                {isAddingToken && (
                  <div
                    className="absolute inset-0 bg-red-500 rounded-md transition-all duration-1000 ease-linear"
                    style={{
                      width: `${((5 - countdownSeconds) / 5) * 100}%`,
                      right: 0,
                      transition: 'width 1s linear'
                    }}
                  />
                )}
                {/* Mobile keyboard dismiss button */}
                <div className="sm:hidden mb-2">
                  <Button
                    onClick={() => {
                      // Dismiss keyboard on mobile
                      if (inputRef.current) {
                        inputRef.current.blur();
                      }
                      // Also blur any other focused inputs
                      if (document.activeElement instanceof HTMLInputElement) {
                        document.activeElement.blur();
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Dismiss Keyboard
                  </Button>
                </div>

                <Button
                  onClick={isAddingToken ? cancelAddToken : handleProcessTransaction}
                  disabled={
                    !currentStudent?.isRegistered ||
                    (addTokenMode
                      ? (isAddingToken ? false : transactionAmountNum <= 0)
                      : (!transactionStatus || totalItemPrices === 0 || (change < 0 && transactionStatus !== 'Credit' && transactionStatus !== 'Partial') || (transactionStatus !== 'Credit' && transactionStatus !== 'Partial' && !transactionAmount)))
                  }
                  className={`w-full relative z-10 ${isAddingToken ? 'bg-red-500 hover:bg-red-600' : ''}`}
                  size="sm"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {isAddingToken
                    ? `Cancel (${countdownSeconds}s)`
                    : addTokenMode
                      ? 'Buy Token'
                      : 'Process Transaction'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}