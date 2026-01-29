import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Edit, Trash2 } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/context/UserDataContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";

export default function Analytics() {
  const { format } = useCurrency();
  const { user } = useAuth();
  const { userData } = useUserData();
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [currentMonthTransactions, setCurrentMonthTransactions] = useState([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [transactionsRes, debtsRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }),
        supabase.from('debts').select('*').eq('user_id', user?.id).eq('status', 'active')
      ]);

      setTransactions(transactionsRes.data || []);
      setDebts(debtsRes.data || []);
      
      // Filter current month transactions for budget progress
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthTransactions = (transactionsRes.data || []).filter(t => {
        const transactionDate = new Date(t.transaction_date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear &&
               t.transaction_type === 'expense';
      });
      setCurrentMonthTransactions(monthTransactions);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate real metrics with proper data
  const monthlyIncome = Number(userData.income?.monthlyIncome) || 0;
  const plannedExpenses = Object.values(userData.expenses || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  const currentSavings = Number(userData.income?.currentSavings) || 0;
  const currentInvestments = Number(userData.income?.currentInvestments) || 0;
  const totalDebt = debts.reduce((sum, debt) => sum + Number(debt.remaining_amount || 0), 0);
  
  // Calculate actual spent this month from transactions
  const actualMonthlyExpenses = currentMonthTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const monthlySavings = monthlyIncome - actualMonthlyExpenses;
  const netWorth = currentSavings + currentInvestments - totalDebt;

  // Chart data with current month
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'short' });
  const incomeExpenseData = [
    { month: currentMonthName, income: monthlyIncome, expenses: actualMonthlyExpenses }
  ];

  // Calculate spending breakdown from actual transactions
  const categorySpending = currentMonthTransactions.reduce((acc, t) => {
    const category = t.category || 'Other';
    acc[category] = (acc[category] || 0) + Number(t.amount || 0);
    return acc;
  }, {});

  const spendingData = Object.entries(categorySpending).map(([name, value], index) => ({
    name,
    value: actualMonthlyExpenses > 0 ? Math.round((Number(value) / actualMonthlyExpenses) * 100) : 0,
    color: ["#8BC34A", "#4CAF50", "#2196F3", "#FF9800", "#F44336", "#9C27B0", "#607D8B"][index % 7]
  })).filter(item => item.value > 0);

  const netWorthData = [
    { month: currentMonthName, value: netWorth }
  ];

  const editTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    setEditAmount(Number(transaction.amount).toString());
    setEditCategory(transaction.category);
    setEditDescription(transaction.description || '');
  };

  const saveTransaction = async () => {
    if (!editingTransaction) return;
    
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          amount: parseFloat(editAmount),
          category: editCategory,
          description: editDescription
        })
        .eq('id', editingTransaction.id);

      if (error) throw error;
      
      toast({ title: "Transaction updated successfully" });
      setEditingTransaction(null);
      loadData();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({ title: "Error updating transaction", variant: "destructive" });
    }
  };

  const deleteTransaction = async (id) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Transaction deleted successfully" });
      loadData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({ title: "Error deleting transaction", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Financial Analytics – Money Matter</title>
        <meta name="description" content="Your financial journey, visualized" />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/analytics" />
      </Helmet>

      <div className="px-4 py-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Financial Analytics</h1>
          <p className="text-muted-foreground">Your financial journey, visualized.</p>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className={`${netWorth >= 0 ? 'bg-green-600' : 'bg-red-600'} text-white`}>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <CardTitle className="text-sm">Current Net Worth</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{format(netWorth)}</div>
              </CardContent>
            </Card>

            <Card className="bg-blue-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <CardTitle className="text-sm">Monthly Savings</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{format(monthlySavings)}</div>
              </CardContent>
            </Card>

            <Card className="bg-orange-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-5 h-5" />
                  <CardTitle className="text-sm">Monthly Expenses</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{format(actualMonthlyExpenses)}</div>
              </CardContent>
            </Card>

            <Card className="bg-red-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <CardTitle className="text-sm">Total Debt</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{format(totalDebt)}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span>Net Worth Progression</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={netWorthData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [format(Number(value)), "Net Worth"]} />
                  <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={3} dot={{ fill: "#10B981", r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart className="w-5 h-5 text-blue-600" />
                  <span>Income vs. Expenses</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={incomeExpenseData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [format(Number(value)), ""]} />
                    <Bar dataKey="income" fill="#10B981" name="Income" />
                    <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-pink-600" />
                  <span>Spending Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={spendingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {spendingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {spendingData.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart className="w-5 h-5 text-gray-600" />
                <span>Recent Transactions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Loading transactions...
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction: any, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{transaction.category}</Badge>
                        </TableCell>
                        <TableCell>{transaction.description || 'No description'}</TableCell>
                         <TableCell>{format(transaction.amount)}</TableCell>
                         <TableCell>
                           <div className="flex space-x-2">
                             <Dialog>
                               <DialogTrigger asChild>
                                 <Button variant="ghost" size="sm" onClick={() => editTransaction(transaction)}>
                                   <Edit className="w-4 h-4" />
                                 </Button>
                               </DialogTrigger>
                               <DialogContent>
                                 <DialogHeader>
                                   <DialogTitle>Edit Transaction</DialogTitle>
                                 </DialogHeader>
                                 <div className="space-y-4">
                                   <div>
                                     <label className="text-sm text-muted-foreground">Amount</label>
                                     <Input 
                                       type="number" 
                                       value={editAmount} 
                                       onChange={(e) => setEditAmount(e.target.value)} 
                                     />
                                   </div>
                                   <div>
                                     <label className="text-sm text-muted-foreground">Category</label>
                                     <Select value={editCategory} onValueChange={setEditCategory}>
                                       <SelectTrigger>
                                         <SelectValue placeholder="Select category" />
                                       </SelectTrigger>
                                       <SelectContent>
                                         <SelectItem value="Food">Food</SelectItem>
                                         <SelectItem value="Transport">Transport</SelectItem>
                                         <SelectItem value="Bills">Bills</SelectItem>
                                         <SelectItem value="Shopping">Shopping</SelectItem>
                                         <SelectItem value="Health">Health</SelectItem>
                                         <SelectItem value="Entertainment">Entertainment</SelectItem>
                                         <SelectItem value="Other">Other</SelectItem>
                                       </SelectContent>
                                     </Select>
                                   </div>
                                   <div>
                                     <label className="text-sm text-muted-foreground">Description</label>
                                     <Input 
                                       value={editDescription} 
                                       onChange={(e) => setEditDescription(e.target.value)} 
                                       placeholder="Description" 
                                     />
                                   </div>
                                   <Button onClick={saveTransaction} className="w-full">
                                     Save Changes
                                   </Button>
                                 </div>
                               </DialogContent>
                             </Dialog>
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               onClick={() => deleteTransaction(transaction.id)}
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                         </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}