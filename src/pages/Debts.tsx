import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, TrendingDown, Plus, Edit, Trash2 } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
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

export default function Debts() {
  const { format } = useCurrency();
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  const [newDebt, setNewDebt] = useState({
    creditor_name: '',
    debt_type: 'Loan',
    total_amount: 0,
    remaining_amount: 0,
    monthly_payment: 0,
    interest_rate: 0,
    due_date: ''
  });
  useEffect(() => {
    if (user) {
      fetchDebts();
    }
  }, [user]);

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

  const totalDebt = debts.reduce((sum, debt) => sum + debt.remaining_amount, 0);
  const totalMonthlyPayments = debts.reduce((sum, debt) => sum + (debt.monthly_payment || 0), 0);

  const handleCreateDebt = async () => {
    if (!user) return;
    try {
      const { error, data } = await supabase
        .from('debts')
        .insert({
          user_id: user.id,
          creditor_name: newDebt.creditor_name.trim(),
          debt_type: newDebt.debt_type,
          total_amount: Number(newDebt.total_amount) || 0,
          remaining_amount: Number(newDebt.remaining_amount) || 0,
          monthly_payment: Number(newDebt.monthly_payment) || null,
          interest_rate: Number(newDebt.interest_rate) || null,
          due_date: newDebt.due_date || null,
          status: 'active'
        })
        .select()
        .single();
      if (error) throw error;
      setDebts((prev) => [data as any, ...prev]);
      setDebtDialogOpen(false);
      setNewDebt({ creditor_name: '', debt_type: 'Loan', total_amount: 0, remaining_amount: 0, monthly_payment: 0, interest_rate: 0, due_date: '' });
      toast({ title: 'Debt added' });
    } catch (e) {
      console.error('Error creating debt:', e);
      toast({ title: 'Failed to add debt', variant: 'destructive' });
    }
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
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => setDebtDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Debt/EMI
            </Button>
          </div>

          <Dialog open={debtDialogOpen} onOpenChange={setDebtDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Debt/EMI</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Creditor Name</Label>
                  <Input value={newDebt.creditor_name} onChange={(e) => setNewDebt({ ...newDebt, creditor_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Input value={newDebt.debt_type} onChange={(e) => setNewDebt({ ...newDebt, debt_type: e.target.value })} />
                  </div>
                  <div>
                    <Label>Interest %</Label>
                    <Input type="number" value={newDebt.interest_rate} onChange={(e) => setNewDebt({ ...newDebt, interest_rate: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Total Amount</Label>
                    <Input type="number" value={newDebt.total_amount} onChange={(e) => setNewDebt({ ...newDebt, total_amount: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Remaining</Label>
                    <Input type="number" value={newDebt.remaining_amount} onChange={(e) => setNewDebt({ ...newDebt, remaining_amount: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Monthly Payment</Label>
                    <Input type="number" value={newDebt.monthly_payment} onChange={(e) => setNewDebt({ ...newDebt, monthly_payment: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" value={newDebt.due_date} onChange={(e) => setNewDebt({ ...newDebt, due_date: e.target.value })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDebtDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateDebt}>Add</Button>
              </DialogFooter>
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
                  <Calendar className="w-5 h-5" />
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

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Debts</h2>
            {loading ? (
              <div className="text-center py-8">Loading debts...</div>
            ) : debts.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-gray-500 mb-4">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No debts found. Great job on staying debt-free!</p>
                </div>
                <Button className="bg-red-600 hover:bg-red-700">
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
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
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
                    </div>

                    {debt.due_date && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Due Date</div>
                          <div className="font-semibold">{new Date(debt.due_date).toLocaleDateString()}</div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}