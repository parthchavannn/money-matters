import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/context/CurrencyContext";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Repeat, Trash2, Edit2, Calendar, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { addDays, addWeeks, addMonths, addYears, format as formatDate } from "date-fns";

interface RecurringTransaction {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  transaction_type: 'income' | 'expense';
  description: string | null;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date: string | null;
  next_occurrence: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const EXPENSE_CATEGORIES = ["Food", "Transport", "Bills", "Shopping", "Health", "Entertainment", "Subscriptions", "Other"] as const;
const INCOME_CATEGORIES = ["Salary", "Freelance", "Investment Returns", "Rental", "Business", "Other"] as const;
const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

const todayStr = () => new Date().toISOString().slice(0, 10);

const getNextOccurrence = (currentDate: string, frequency: string): string => {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'daily': return addDays(date, 1).toISOString().slice(0, 10);
    case 'weekly': return addWeeks(date, 1).toISOString().slice(0, 10);
    case 'biweekly': return addWeeks(date, 2).toISOString().slice(0, 10);
    case 'monthly': return addMonths(date, 1).toISOString().slice(0, 10);
    case 'quarterly': return addMonths(date, 3).toISOString().slice(0, 10);
    case 'yearly': return addYears(date, 1).toISOString().slice(0, 10);
    default: return addMonths(date, 1).toISOString().slice(0, 10);
  }
};

export default function RecurringTransactions() {
  const { currency, rates, format } = useCurrency();
  const { user } = useAuth();
  const rate = rates[currency.code] ?? 1;

  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Bills',
    transaction_type: 'expense' as 'income' | 'expense',
    description: '',
    frequency: 'monthly' as RecurringTransaction['frequency'],
    start_date: todayStr(),
    end_date: '',
  });

  const toINR = (valueInCurrent: number) => (rate ? valueInCurrent / rate : valueInCurrent);
  const fromINR = (valueInINR: number) => valueInINR * rate;

  useEffect(() => {
    if (user) {
      fetchRecurringTransactions();
    }
  }, [user]);

  const fetchRecurringTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('next_occurrence', { ascending: true });

      if (error) throw error;
      setRecurringTransactions((data || []) as RecurringTransaction[]);
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
      toast.error('Failed to load recurring transactions');
    } finally {
      setLoading(false);
    }
  };

  const processRecurringTransactions = async () => {
    const today = todayStr();
    const dueTransactions = recurringTransactions.filter(
      rt => rt.is_active && rt.next_occurrence <= today
    );

    if (dueTransactions.length === 0) {
      toast.info('No recurring transactions due today');
      return;
    }

    try {
      for (const rt of dueTransactions) {
        // Create actual transaction
        await supabase.from('transactions').insert({
          user_id: user?.id,
          amount: rt.amount,
          transaction_date: today,
          transaction_type: rt.transaction_type,
          category: rt.category,
          description: rt.description ? `[Recurring] ${rt.description}` : '[Recurring]',
        });

        // Update next occurrence
        const newNextOccurrence = getNextOccurrence(rt.next_occurrence, rt.frequency);
        
        // Check if we've passed the end date
        const shouldDeactivate = rt.end_date && newNextOccurrence > rt.end_date;

        await supabase
          .from('recurring_transactions')
          .update({
            next_occurrence: newNextOccurrence,
            is_active: !shouldDeactivate,
          })
          .eq('id', rt.id);
      }

      toast.success(`Processed ${dueTransactions.length} recurring transaction(s)`);
      fetchRecurringTransactions();
    } catch (error) {
      console.error('Error processing recurring transactions:', error);
      toast.error('Failed to process recurring transactions');
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    const amt = parseFloat(formData.amount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    const amountInINR = Math.round(toINR(amt));
    const nextOccurrence = formData.start_date;

    try {
      if (editingId) {
        const { error } = await supabase
          .from('recurring_transactions')
          .update({
            amount: amountInINR,
            category: formData.category,
            transaction_type: formData.transaction_type,
            description: formData.description || null,
            frequency: formData.frequency,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            next_occurrence: nextOccurrence,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Recurring transaction updated');
      } else {
        const { error } = await supabase
          .from('recurring_transactions')
          .insert({
            user_id: user.id,
            amount: amountInINR,
            category: formData.category,
            transaction_type: formData.transaction_type,
            description: formData.description || null,
            frequency: formData.frequency,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            next_occurrence: nextOccurrence,
            is_active: true,
          });

        if (error) throw error;
        toast.success('Recurring transaction created');
      }

      resetForm();
      setIsDialogOpen(false);
      fetchRecurringTransactions();
    } catch (error) {
      console.error('Error saving recurring transaction:', error);
      toast.error('Failed to save recurring transaction');
    }
  };

  const handleEdit = (rt: RecurringTransaction) => {
    setEditingId(rt.id);
    setFormData({
      amount: fromINR(rt.amount).toString(),
      category: rt.category,
      transaction_type: rt.transaction_type,
      description: rt.description || '',
      frequency: rt.frequency,
      start_date: rt.start_date,
      end_date: rt.end_date || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Recurring transaction deleted');
      fetchRecurringTransactions();
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      toast.error('Failed to delete recurring transaction');
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentState ? 'Transaction paused' : 'Transaction resumed');
      fetchRecurringTransactions();
    } catch (error) {
      console.error('Error toggling recurring transaction:', error);
      toast.error('Failed to update recurring transaction');
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      category: 'Bills',
      transaction_type: 'expense',
      description: '',
      frequency: 'monthly',
      start_date: todayStr(),
      end_date: '',
    });
    setEditingId(null);
  };

  const categories = formData.transaction_type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const totalMonthlyExpenses = recurringTransactions
    .filter(rt => rt.is_active && rt.transaction_type === 'expense')
    .reduce((sum, rt) => {
      const multiplier = rt.frequency === 'daily' ? 30 :
        rt.frequency === 'weekly' ? 4 :
        rt.frequency === 'biweekly' ? 2 :
        rt.frequency === 'monthly' ? 1 :
        rt.frequency === 'quarterly' ? 1/3 :
        1/12;
      return sum + (rt.amount * multiplier);
    }, 0);

  const totalMonthlyIncome = recurringTransactions
    .filter(rt => rt.is_active && rt.transaction_type === 'income')
    .reduce((sum, rt) => {
      const multiplier = rt.frequency === 'daily' ? 30 :
        rt.frequency === 'weekly' ? 4 :
        rt.frequency === 'biweekly' ? 2 :
        rt.frequency === 'monthly' ? 1 :
        rt.frequency === 'quarterly' ? 1/3 :
        1/12;
      return sum + (rt.amount * multiplier);
    }, 0);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Recurring Transactions – Money Matter</title>
        <meta name="description" content="Manage recurring income and expenses like subscriptions, bills, and salary." />
      </Helmet>

      <main className="container py-8 md:py-10">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Repeat className="h-8 w-8" />
              Recurring Transactions
            </h1>
            <p className="text-muted-foreground">Automate tracking of subscriptions, bills, and regular income</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={processRecurringTransactions}>
              <Calendar className="h-4 w-4 mr-2" />
              Process Due
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recurring
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit' : 'Add'} Recurring Transaction</DialogTitle>
                  <DialogDescription>
                    Set up automatic tracking for regular income or expenses
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={formData.transaction_type === 'expense' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setFormData({ ...formData, transaction_type: 'expense', category: 'Bills' })}
                    >
                      <ArrowDownCircle className="h-4 w-4 mr-2" />
                      Expense
                    </Button>
                    <Button
                      type="button"
                      variant={formData.transaction_type === 'income' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setFormData({ ...formData, transaction_type: 'income', category: 'Salary' })}
                    >
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      Income
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground">Amount ({currency.symbol})</label>
                      <Input
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0"
                        type="number"
                        inputMode="decimal"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Frequency</label>
                      <Select
                        value={formData.frequency}
                        onValueChange={(v) => setFormData({ ...formData, frequency: v as RecurringTransaction['frequency'] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCIES.map((f) => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Category</label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Description (optional)</label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g., Netflix subscription"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground">Start Date</label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">End Date (optional)</label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        min={formData.start_date}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                      {editingId ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Recurring Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{format(totalMonthlyIncome)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Recurring Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{format(totalMonthlyExpenses)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Monthly Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalMonthlyIncome - totalMonthlyExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {format(totalMonthlyIncome - totalMonthlyExpenses)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recurring Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>All Recurring Transactions</CardTitle>
            <CardDescription>
              {recurringTransactions.length} recurring transaction(s) configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : recurringTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Repeat className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No recurring transactions yet</p>
                <p className="text-sm text-muted-foreground">Add subscriptions, bills, or regular income to automate tracking</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recurringTransactions.map((rt) => (
                  <div
                    key={rt.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${!rt.is_active ? 'opacity-50 bg-muted/50' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${rt.transaction_type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {rt.transaction_type === 'income' ? (
                          <ArrowUpCircle className="h-5 w-5" />
                        ) : (
                          <ArrowDownCircle className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {rt.description || rt.category}
                          <Badge variant="secondary" className="text-xs">{rt.frequency}</Badge>
                          {!rt.is_active && <Badge variant="outline" className="text-xs">Paused</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {rt.category} • Next: {formatDate(new Date(rt.next_occurrence), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`text-lg font-semibold ${rt.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {rt.transaction_type === 'income' ? '+' : '-'}{format(rt.amount)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rt.is_active}
                          onCheckedChange={() => toggleActive(rt.id, rt.is_active)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(rt)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rt.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
