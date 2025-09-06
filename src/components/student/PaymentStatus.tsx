import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Clock, CreditCard, Ban } from 'lucide-react';
import { getStudentPaymentStatus, processOverduePayment } from '@/lib/paymentRecovery';
import { toast } from 'sonner';

interface PaymentStatusProps {
  studentId: string;
}

export function PaymentStatus({ studentId }: PaymentStatusProps) {
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  const loadPaymentStatus = async () => {
    try {
      setLoading(true);
      const status = await getStudentPaymentStatus(studentId);
      setPaymentStatus(status);
    } catch (error) {
      console.error('Error loading payment status:', error);
      toast.error('Failed to load payment status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentStatus();
  }, [studentId]);

  const handlePayment = async (transactionId: string, amount: number) => {
    try {
      setProcessingPayment(transactionId);
      await processOverduePayment(transactionId, amount);
      toast.success('Payment processed successfully');
      await loadPaymentStatus(); // Reload status
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment');
    } finally {
      setProcessingPayment(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading payment status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!paymentStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Failed to load payment status</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { student, overdueTransactions, totalOverdue, canMakeNewTransactions, suspensionReason } = paymentStatus;

  return (
    <div className="space-y-6">
      {/* Account Status Alert */}
      {!canMakeNewTransactions && (
        <Alert className="border-red-200 bg-red-50">
          <Ban className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Account Restricted:</strong> {suspensionReason || 'Your account has been suspended'}
          </AlertDescription>
        </Alert>
      )}

      {/* Loyalty Points Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Loyalty Points</p>
              <p className={`text-2xl font-bold ${
                (student.loyalty || 0) >= 100 ? 'text-yellow-600' :
                (student.loyalty || 0) >= 90 ? 'text-blue-600' :
                (student.loyalty || 0) >= 50 ? 'text-green-600' : 'text-red-600'
              }`}>
                {student.loyalty || 0}/100
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account Status</p>
              <Badge variant={student.isActive ? 'default' : 'destructive'} className="mt-1">
                {student.isActive ? 'Active' : 'Suspended'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Transaction Access</p>
              <Badge variant={canMakeNewTransactions ? 'default' : 'secondary'} className="mt-1">
                {canMakeNewTransactions ? 'Allowed' : 'Restricted'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Payments */}
      {overdueTransactions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Overdue Payments
              <Badge variant="destructive" className="ml-2">
                {overdueTransactions.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              You have {overdueTransactions.length} overdue payment{overdueTransactions.length !== 1 ? 's' : ''} totaling ₱{totalOverdue.toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overdueTransactions.map((transaction) => (
                <div key={transaction.$id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">Transaction #{transaction.$id.slice(-8)}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        ₱{Math.abs(transaction.amount).toFixed(2)}
                      </p>
                      <Badge variant="destructive" className="text-xs">
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Loyalty deductions: {transaction.loyaltyDeductions || 0} points
                    </div>
                    <Button
                      onClick={() => handlePayment(transaction.$id, Math.abs(transaction.amount))}
                      disabled={processingPayment === transaction.$id}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processingPayment === transaction.$id ? (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </div>
                      ) : (
                        'Pay Now'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-green-600 mb-2">All payments up to date!</p>
              <p className="text-muted-foreground">
                You have no overdue payments. Keep up the good work!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Payment Terms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="font-medium">₱50 and below</span>
              <Badge variant="outline">3 days to pay</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="font-medium">₱51-₱99</span>
              <Badge variant="outline">4 days to pay</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="font-medium">₱100 and above</span>
              <Badge variant="outline">5 days to pay</Badge>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Late payments will result in loyalty point deductions. 
              Accounts with low loyalty points may be suspended or banned.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
