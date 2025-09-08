import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, CreditCard, TrendingDown, AlertTriangle, Edit, Trash2, CheckCircle, Lightbulb, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface Debt {
  id: string;
  creditor_name: string;
  debt_type: string;
  total_amount: number;
  remaining_amount: number;
  monthly_payment: number;
  interest_rate: number;
  due_date: string;
  status: string;
}

const calculateTotalRepayment = (debt: Debt): number => {
  if (!debt.monthly_payment || !debt.interest_rate || !debt.remaining_amount) {
    return debt.remaining_amount;
  }
  
  const monthlyRate = debt.interest_rate / 100 / 12;
  const monthsToRepay = Math.ceil(debt.remaining_amount / debt.monthly_payment);
  
  // Simple compound interest calculation
  const totalWithInterest = debt.remaining_amount * Math.pow(1 + monthlyRate, monthsToRepay);
  
  return totalWithInterest;
};

const calculateSuggestedPayment = (debt: Debt): { amount: number; message: string } => {
  if (!debt.due_date) {
    return { 
      amount: 0, 
      message: "Set a due date to get payment suggestions" 
    };
  }

  const today = new Date();
  const dueDate = new Date(debt.due_date);
  const monthsUntilDue = Math.max(1, Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)));

  if (monthsUntilDue <= 0) {
    return { 
      amount: debt.remaining_amount, 
      message: "Payment overdue! Pay full amount immediately" 
    };
  }

  let suggestedAmount = debt.remaining_amount / monthsUntilDue;

  // Factor in interest if available
  if (debt.interest_rate && debt.interest_rate > 0) {
    const monthlyRate = debt.interest_rate / 100 / 12;
    // Use PMT formula for loan payments
    const numerator = debt.remaining_amount * monthlyRate * Math.pow(1 + monthlyRate, monthsUntilDue);
    const denominator = Math.pow(1 + monthlyRate, monthsUntilDue) - 1;
    suggestedAmount = numerator / denominator;
  }

  const urgencyMessage = monthsUntilDue <= 3 ? "Urgent: " : monthsUntilDue <= 6 ? "Soon: " : "";
  
  return { 
    amount: suggestedAmount, 
    message: `${urgencyMessage}Pay ₹${Math.ceil(suggestedAmount).toLocaleString()} monthly to clear by due date (${monthsUntilDue} months left)` 
  };
};

export default function Debts() {
  const { format } = useCurrency();
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showCompletedDebts, setShowCompletedDebts] = useState(false);
  const [completedDebts, setCompletedDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [newDebt, setNewDebt] = useState({
    creditor_name: '',
    debt_type: '',
    total_amount: '',
    remaining_amount: '',
    monthly_payment: '',
    interest_rate: '',
    due_date: ''
  });

  useEffect(() => {
    if (user) {
      fetchDebts();
      if (showCompletedDebts) {
        fetchCompletedDebts();
      }
    }
  }, [user, showCompletedDebts]);

  const fetchDebts = async () => {
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (error) throw error;
      setDebts(data || []);
    } catch (error) {
      console.error('Error fetching debts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedDebts = async () => {
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'completed');

      if (error) throw error;
      setCompletedDebts(data || []);
    } catch (error) {
      console.error('Error fetching completed debts:', error);
    }
  };

  const totalDebt = debts.reduce((sum, debt) => sum + debt.remaining_amount, 0);
  const totalMonthlyPayments = debts.reduce((sum, debt) => sum + (debt.monthly_payment || 0), 0);

  const handleCreateDebt = async () => {
    if (!user) return;

    const debtData = {
      user_id: user.id,
      creditor_name: newDebt.creditor_name,
      debt_type: newDebt.debt_type,
      total_amount: parseFloat(newDebt.total_amount),
      remaining_amount: parseFloat(newDebt.remaining_amount),
      monthly_payment: parseFloat(newDebt.monthly_payment) || null,
      interest_rate: parseFloat(newDebt.interest_rate) || null,
      due_date: newDebt.due_date || null,
      status: 'active'
    };

    if (editingDebt) {
      const { data, error } = await supabase
        .from('debts')
        .update(debtData)
        .eq('id', editingDebt.id)
        .select();

      if (error) {
        console.error('Error updating debt:', error);
        return;
      }

      if (data) {
        setDebts(debts.map(d => d.id === editingDebt.id ? data[0] : d));
        resetForm();
      }
    } else {
      const { data, error } = await supabase
        .from('debts')
        .insert([debtData])
        .select();

      if (error) {
        console.error('Error creating debt:', error);
        return;
      }

      if (data) {
        setDebts([...debts, data[0]]);
        resetForm();
      }
    }
  };

  const handleEditDebt = (debt: Debt) => {
    setEditingDebt(debt);
    setNewDebt({
      creditor_name: debt.creditor_name,
      debt_type: debt.debt_type,
      total_amount: debt.total_amount.toString(),
      remaining_amount: debt.remaining_amount.toString(),
      monthly_payment: debt.monthly_payment?.toString() || '',
      interest_rate: debt.interest_rate?.toString() || '',
      due_date: debt.due_date || ''
    });
    setShowDialog(true);
  };

  const handleDeleteDebt = async (debtId: string) => {
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', debtId);

    if (error) {
      console.error('Error deleting debt:', error);
      return;
    }

    setDebts(debts.filter(d => d.id !== debtId));
  };

  const handleCompleteDebt = async (debt: Debt) => {
    if (!user) return;
    
    if (!confirm(`Mark ${debt.creditor_name} debt as completed?`)) return;
    
    try {
      const { error } = await supabase
        .from('debts')
        .update({
          status: 'completed',
          remaining_amount: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', debt.id);

      if (error) throw error;
      
      // Remove from active debts list and refresh data
      setDebts(debts.filter(d => d.id !== debt.id));
      if (showCompletedDebts) {
        fetchCompletedDebts();
      }
      toast.success(`${debt.creditor_name} debt marked as completed!`);
    } catch (error) {
      console.error('Error completing debt:', error);
      toast.error('Failed to mark debt as completed');
    }
  };

  const resetForm = () => {
    setNewDebt({
      creditor_name: '',
      debt_type: '',
      total_amount: '',
      remaining_amount: '',
      monthly_payment: '',
      interest_rate: '',
      due_date: ''
    });
    setEditingDebt(null);
    setShowDialog(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Debts & EMIs – Money Matter</title>
        <meta name="description" content="Manage and track your debt payments" />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/debts" />
      </Helmet>

      <div className="md:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Debts & EMIs</h1>
              <p className="text-gray-600">Manage and track your debt payments</p>
            </div>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Debt/EMI
            </Button>
          </div>

        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
          <DialogContent className="sm:max-w-[500px]" aria-describedby="debt-dialog-description">
            <DialogHeader>
              <DialogTitle>{editingDebt ? 'Edit Debt' : 'Add New Debt'}</DialogTitle>
              <DialogDescription id="debt-dialog-description">
                {editingDebt ? 'Update your debt information below.' : 'Enter details for your new debt.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="creditor_name">Creditor Name</Label>
                <Input
                  id="creditor_name"
                  value={newDebt.creditor_name}
                  onChange={(e) => setNewDebt({...newDebt, creditor_name: e.target.value})}
                  placeholder="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="debt_type">Debt Type</Label>
                  <Select value={newDebt.debt_type} onValueChange={(value) => setNewDebt({...newDebt, debt_type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="personal_loan">Personal Loan</SelectItem>
                      <SelectItem value="home_loan">Home Loan</SelectItem>
                      <SelectItem value="car_loan">Car Loan</SelectItem>
                      <SelectItem value="education_loan">Education Loan</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                  <Input
                    id="interest_rate"
                    type="number"
                    step="0.01"
                    value={newDebt.interest_rate}
                    onChange={(e) => setNewDebt({...newDebt, interest_rate: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="total_amount">Total Amount</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    value={newDebt.total_amount}
                    onChange={(e) => setNewDebt({...newDebt, total_amount: e.target.value})}
                    placeholder="0"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="remaining_amount">Remaining Amount</Label>
                  <Input
                    id="remaining_amount"
                    type="number"
                    value={newDebt.remaining_amount}
                    onChange={(e) => setNewDebt({...newDebt, remaining_amount: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="monthly_payment">Monthly Payment</Label>
                  <Input
                    id="monthly_payment"
                    type="number"
                    value={newDebt.monthly_payment}
                    onChange={(e) => setNewDebt({...newDebt, monthly_payment: e.target.value})}
                    placeholder="0"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={newDebt.due_date}
                    onChange={(e) => setNewDebt({...newDebt, due_date: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => resetForm()}>
                Cancel
              </Button>
              <Button onClick={handleCreateDebt}>
                {editingDebt ? 'Update Debt' : 'Add Debt'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-red-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <CardTitle className="text-lg">Total Debt</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{format(totalDebt)}</div>
              </CardContent>
            </Card>

            <Card className="bg-orange-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <CardTitle className="text-lg">Monthly Payments</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{format(totalMonthlyPayments)}</div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-5 h-5" />
                  <CardTitle className="text-lg">Active Debts</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{debts.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Your Debts</h2>
            <div className="flex items-center space-x-2">
              <label htmlFor="show-completed" className="text-sm text-gray-600">
                Show Completed
              </label>
              <Switch
                id="show-completed"
                checked={showCompletedDebts}
                onCheckedChange={setShowCompletedDebts}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading debts...</div>
          ) : debts.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-gray-500 mb-4">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No debts found. Great job on staying debt-free!</p>
              </div>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Debt (if needed)
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {debts.map((debt) => (
                <Card key={debt.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">💳</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{debt.creditor_name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{debt.debt_type}</Badge>
                          <Badge variant="secondary">{debt.status}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleCompleteDebt(debt)}
                        className="text-green-600 border-green-600 hover:bg-green-50"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditDebt(debt)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteDebt(debt.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-4">
                    <div>
                      <div className="text-gray-600">Total Amount</div>
                      <div className="font-semibold">{format(debt.total_amount)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Remaining</div>
                      <div className="font-semibold text-red-600">{format(debt.remaining_amount)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Monthly Payment</div>
                      <div className="font-semibold">{debt.monthly_payment ? format(debt.monthly_payment) : 'Not set'}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Interest Rate</div>
                      <div className="font-semibold">{debt.interest_rate ? `${debt.interest_rate}%` : 'Not set'}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Total to Repay</div>
                      <div className="font-semibold text-orange-600">{format(calculateTotalRepayment(debt))}</div>
                    </div>
                  </div>

                   {debt.due_date && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-800">Payment Insights & Suggestions</span>
                      </div>
                      <div className="text-sm text-blue-700 mb-3">
                        {calculateSuggestedPayment(debt).message}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-blue-600">Due Date</div>
                          <div className="font-semibold">{new Date(debt.due_date).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-blue-600">Suggested Monthly Payment</div>
                          <div className="font-bold text-lg text-blue-800">
                            {format(calculateSuggestedPayment(debt).amount)}
                          </div>
                        </div>
                        <div>
                          <div className="text-blue-600">Interest on Remaining</div>
                          <div className="font-semibold text-orange-600">
                            {debt.interest_rate ? `${((debt.remaining_amount * debt.interest_rate / 100) / 12).toFixed(0)} monthly` : 'Not set'}
                          </div>
                        </div>
                      </div>
                      
                      {debt.interest_rate && debt.interest_rate > 15 && (
                        <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                          <strong>High Interest Alert:</strong> Consider paying more than minimum to reduce total interest burden.
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Completed Debts Section */}
          {showCompletedDebts && (
            <div className="mt-8">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Completed Debts</h3>
                <Badge variant="secondary">{completedDebts.length}</Badge>
              </div>
              
              {completedDebts.length === 0 ? (
                <Card className="p-6 text-center">
                  <div className="text-gray-500">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No completed debts yet.</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {completedDebts.map((debt) => (
                    <Card key={debt.id} className="p-4 bg-green-50 border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">✅</div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{debt.creditor_name}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="border-green-600 text-green-600">
                                {debt.debt_type}
                              </Badge>
                              <Badge className="bg-green-600">Completed</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Original Amount</div>
                          <div className="font-semibold text-gray-900">{format(debt.total_amount)}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}