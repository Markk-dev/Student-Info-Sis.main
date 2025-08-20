import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { QrCode, UserCheck, UserX, Plus, Minus, ShoppingCart, Camera, CameraOff } from 'lucide-react';
import { toast } from 'sonner';
import { studentService } from '@/lib/services';
import { BrowserMultiFormatReader } from '@zxing/library';

interface Student {
  id: string;
  name: string;
  course: string;
  yearLevel: string;
  isRegistered: boolean;
}

interface BarcodeScannerProps {
  onAddTransaction: (transaction: any) => void;
}

export function BarcodeScanner({ onAddTransaction }: BarcodeScannerProps) {
  const [scannedCode, setScannedCode] = useState('');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [isNewStudent, setIsNewStudent] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [newStudentData, setNewStudentData] = useState({
    name: '',
    course: '',
    yearLevel: ''
  });
  const [quickAmounts] = useState([25, 50, 75, 100, 125, 150]);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanner, setScanner] = useState<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  
  const validateStudentId = (value: string): string => {
    
    let cleaned = value.replace(/[^\d-]/g, '');
    
    
    const parts = cleaned.split('-');
    if (parts.length > 2) {
      cleaned = parts[0] + '-' + parts.slice(1).join('');
    }
    
    
    if (parts.length >= 1 && parts[0].length > 3) {
      parts[0] = parts[0].substring(0, 3);
    }
    if (parts.length >= 2 && parts[1].length > 3) {
      parts[1] = parts[1].substring(0, 3);
    }
    
    
    return parts.join('-');
  };

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const validatedValue = validateStudentId(value);
    setScannedCode(validatedValue);
  };

  
  const isStudentIdValid = (id: string): boolean => {
    const pattern = /^\d{3}-\d{3}$/;
    return pattern.test(id);
  };

  const handleScan = async () => {
    if (!scannedCode || !isStudentIdValid(scannedCode)) {
      toast.error('Please enter a valid student ID in format: 000-000');
      return;
    }
    
    try {
      const student = await studentService.getStudentById(scannedCode);
      
      if (student) {
        setCurrentStudent(student);
        setIsNewStudent(false);
        toast.success(`Student found: ${student.name}`);
      } else {
        // Student not registered yet
        setCurrentStudent({
          id: scannedCode,
          name: '',
          course: '',
          yearLevel: '',
          isRegistered: false
        });
        setIsNewStudent(true);
        toast.warning('Student not registered. Please register them first.');
      }
    } catch (error) {
      toast.error('Error scanning student ID.');
      console.error(error);
    }
  };

  const handleRegisterStudent = async () => {
    if (!newStudentData.name || !newStudentData.course || !newStudentData.yearLevel) {
      toast.error('Please fill in all student information');
      return;
    }

    try {
      const registeredStudent = await studentService.createStudent({
        id: scannedCode,
        name: newStudentData.name,
        course: newStudentData.course,
        yearLevel: newStudentData.yearLevel,
        isRegistered: true
      });

      setCurrentStudent(registeredStudent);
      setIsNewStudent(false);
      toast.success('Student registered successfully!');
    } catch (error) {
      toast.error('Error registering student.');
      console.error(error);
    }
  };

  const handleProcessTransaction = async () => {
    if (!currentStudent || !transactionAmount) {
      toast.error('Please scan a student ID and enter transaction amount');
      return;
    }

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const transaction = {
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      course: currentStudent.course,
      amount: amount,
      timestamp: new Date(),
      cashier: 'Current User'
    };

    onAddTransaction(transaction);
    
    
    setScannedCode('');
    setCurrentStudent(null);
    setTransactionAmount('');
    setIsNewStudent(false);
    setNewStudentData({ name: '', course: '', yearLevel: '' });
    
    
    inputRef.current?.focus();
  };

  const handleQuickAmount = (amount: number) => {
    setTransactionAmount(amount.toString());
  };

  const startCameraScan = async () => {
    try {
      const codeReader = new BrowserMultiFormatReader();
      setScanner(codeReader);
      
      await codeReader.decodeFromVideoDevice(
        null, 
        videoRef.current!,
        (result, error) => {
          if (result) {
            setScannedCode(result.getText());
            setIsScanning(false);
            codeReader.reset();
            handleScan();
            toast.success('Barcode scanned successfully!');
          }
        }
      );
      
      setIsScanning(true);
    } catch (error) {
      console.error('Error starting camera scan:', error);
      toast.error('Failed to start camera scanner');
    }
  };

  const stopCameraScan = () => {
    if (scanner) {
      scanner.reset();
      setIsScanning(false);
    }
  };

  
  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.reset();
      }
    };
  }, [scanner]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Scanner Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Barcode Scanner
          </CardTitle>
          <CardDescription>Scan student ID barcode to begin transaction</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="barcode">Student ID Barcode</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                id="barcode"
                type="text"
                placeholder="Enter student ID (e.g., 123-456)"
                value={scannedCode}
                onChange={handleBarcodeChange}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                className="font-mono"
                pattern="[0-9]{3}-[0-9]{3}"
                title="Please enter student ID in format: 000-000"
              />
              <Button onClick={handleScan} disabled={!isStudentIdValid(scannedCode)}>
                Scan
              </Button>
            </div>
            {scannedCode && !isStudentIdValid(scannedCode) && (
              <p className="text-sm text-red-500 mt-1">
                Please enter student ID in format: 000-000 (e.g., 123-456)
              </p>
            )}
            {scannedCode && isStudentIdValid(scannedCode) && (
              <p className="text-sm text-green-500 mt-1">
                ✓ Valid format
              </p>
            )}
          </div>

          {/* Camera Scanner */}
          <div className="space-y-2">
            <Label>Camera Scanner</Label>
            <div className="space-y-2">
              {!isScanning ? (
                <Button 
                  onClick={startCameraScan} 
                  variant="outline" 
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera Scanner
                </Button>
              ) : (
                <div className="space-y-2">
                  <video
                    ref={videoRef}
                    className="w-full h-48 bg-gray-100 rounded-lg"
                    autoPlay
                    playsInline
                  />
                  <Button 
                    onClick={stopCameraScan} 
                    variant="outline" 
                    className="w-full"
                  >
                    <CameraOff className="h-4 w-4 mr-2" />
                    Stop Camera Scanner
                  </Button>
                </div>
              )}
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
                    <p>{currentStudent.name || 'Not set'}</p>
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
        <CardHeader>
          <CardTitle>
            {isNewStudent ? 'Register New Student' : 'Process Transaction'}
          </CardTitle>
          <CardDescription>
            {isNewStudent 
              ? 'Enter student information to register them in the system'
              : 'Enter transaction amount and process payment'
            }
          </CardDescription>
        </CardHeader>
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
                <div>
                  <Label htmlFor="student-name">Full Name</Label>
                  <Input
                    id="student-name"
                    placeholder="Enter student's full name"
                    value={newStudentData.name}
                    onChange={(e) => setNewStudentData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="student-course">Course</Label>
                  <Input
                    id="student-course"
                    placeholder="e.g., Computer Science"
                    value={newStudentData.course}
                    onChange={(e) => setNewStudentData(prev => ({ ...prev, course: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="student-year">Year Level</Label>
                  <Input
                    id="student-year"
                    placeholder="e.g., 3rd Year"
                    value={newStudentData.yearLevel}
                    onChange={(e) => setNewStudentData(prev => ({ ...prev, yearLevel: e.target.value }))}
                  />
                </div>
              </div>
              
              <Button onClick={handleRegisterStudent} className="w-full">
                Register Student
              </Button>
            </div>
          ) : (
            
            <div className="space-y-4">
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

              {/* Quick Amount Buttons */}
              <div className="space-y-2">
                <Label>Quick Amounts</Label>
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAmount(amount)}
                      disabled={!currentStudent?.isRegistered}
                    >
                      ₱{amount}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleProcessTransaction}
                disabled={!currentStudent?.isRegistered || !transactionAmount}
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