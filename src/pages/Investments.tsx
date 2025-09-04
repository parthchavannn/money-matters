import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/context/UserDataContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export default function Investments() {
  const { format } = useCurrency();
  const { user } = useAuth();
  const { userData } = useUserData();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<any | null>(null);
  const [newInv, setNewInv] = useState({
    name: '',
    type: '',
    invested: '',
    current_value: '',
    invested_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (user) {
      fetchInvestments();
    }
  }, [user]);

  const fetchInvestments = async () => {
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error('Error fetching investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvestment = async () => {
    if (!user) return;

    const investmentData = {
      user_id: user.id,
      name: newInv.name,
      type: newInv.type,
      invested: parseFloat(newInv.invested),
      current_value: parseFloat(newInv.current_value) || null,
      invested_date: newInv.invested_date
    };

    if (editingInvestment) {
      const { data, error } = await supabase
        .from('investments')
        .update(investmentData)
        .eq('id', editingInvestment.id)
        .select();

      if (error) {
        console.error('Error updating investment:', error);
        return;
      }

      if (data) {
        setInvestments(investments.map(inv => inv.id === editingInvestment.id ? data[0] : inv));
        resetForm();
      }
    } else {
      const { data, error } = await supabase
        .from('investments')
        .insert([investmentData])
        .select();

      if (error) {
        console.error('Error creating investment:', error);
        return;
      }

      if (data) {
        setInvestments([...investments, data[0]]);
        resetForm();
      }
    }
  };

  const handleEditInvestment = (investment: any) => {
    setEditingInvestment(investment);
    setNewInv({
      name: investment.name,
      type: investment.type,
      invested: investment.invested.toString(),
      current_value: investment.current_value?.toString() || '',
      invested_date: investment.invested_date
    });
    setShowDialog(true);
  };

  const handleDeleteInvestment = async (investmentId: string) => {
    const { error } = await supabase
      .from('investments')
      .delete()
      .eq('id', investmentId);

    if (error) {
      console.error('Error deleting investment:', error);
      return;
    }

    setInvestments(investments.filter(inv => inv.id !== investmentId));
  };

  const resetForm = () => {
    setNewInv({
      name: '',
      type: '',
      invested: '',
      current_value: '',
      invested_date: new Date().toISOString().split('T')[0]
    });
    setEditingInvestment(null);
    setShowDialog(false);
  };

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.invested || 0), 0);
  const currentValue = investments.reduce((sum, inv) => sum + Number(inv.current_value || inv.invested || 0), 0);
  const pnl = currentValue - totalInvested;
  const availableToInvest = Math.max(0, (userData.income?.monthlyIncome || 0) - Object.values(userData.expenses || {}).reduce((s, v) => s + (Number(v) || 0), 0));

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Your Investments – Money Matter</title>
        <meta name="description" content="Track your portfolio and watch your wealth grow" />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/investments" />
      </Helmet>

      <div className="md:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Investments</h1>
              <p className="text-gray-600">Track your portfolio and watch your wealth grow.</p>
            </div>
            <Button className="bg-black hover:bg-gray-800" onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Log Investment
            </Button>
          </div>

        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
          <DialogContent className="sm:max-w-[425px]" aria-describedby="investment-dialog-description">
            <DialogHeader>
              <DialogTitle>{editingInvestment ? 'Edit Investment' : 'Log New Investment'}</DialogTitle>
              <DialogDescription id="investment-dialog-description">
                {editingInvestment ? 'Update your investment details below.' : 'Enter details for your new investment.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Investment Name</Label>
                <Input
                  id="name"
                  value={newInv.name}
                  onChange={(e) => setNewInv({...newInv, name: e.target.value})}
                  placeholder="RELIANCE, Nifty 50, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={newInv.type} onValueChange={(value) => setNewInv({...newInv, type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stocks">Stocks</SelectItem>
                      <SelectItem value="mutual_funds">Mutual Funds</SelectItem>
                      <SelectItem value="crypto">Cryptocurrency</SelectItem>
                      <SelectItem value="bonds">Bonds</SelectItem>
                      <SelectItem value="etf">ETF</SelectItem>
                      <SelectItem value="fd">Fixed Deposit</SelectItem>
                      <SelectItem value="ppf">PPF</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="invested_date">Date</Label>
                  <Input
                    id="invested_date"
                    type="date"
                    value={newInv.invested_date}
                    onChange={(e) => setNewInv({...newInv, invested_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="invested">Amount Invested</Label>
                  <Input
                    id="invested"
                    type="number"
                    value={newInv.invested}
                    onChange={(e) => setNewInv({...newInv, invested: e.target.value})}
                    placeholder="10000"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="current_value">Current Value</Label>
                  <Input
                    id="current_value"
                    type="number"
                    value={newInv.current_value}
                    onChange={(e) => setNewInv({...newInv, current_value: e.target.value})}
                    placeholder="12000"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => resetForm()}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvestment}>
                {editingInvestment ? 'Update Investment' : 'Log Investment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <PieChart className="w-5 h-5 text-gray-500" />
                  <CardTitle className="text-sm text-gray-600">Total Invested</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{format(totalInvested)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-gray-500" />
                  <CardTitle className="text-sm text-gray-600">Current Value</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{format(currentValue)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-gray-500" />
                  <CardTitle className="text-sm text-gray-600">Overall P&L</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {pnl >= 0 ? '+' : ''}{format(pnl)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-sm text-blue-600">Available to Invest</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{format(availableToInvest)}</div>
                <div className="text-xs text-blue-500 mt-1">From this month's budget surplus</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Investment Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Invested</TableHead>
                    <TableHead>Current Value</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Loading investments...
                      </TableCell>
                    </TableRow>
                  ) : investments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No investments logged yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    investments.map((investment: any) => {
                      const investmentPnl = (investment.current_value || investment.invested) - investment.invested;
                      return (
                        <TableRow key={investment.id}>
                          <TableCell>{investment.name}</TableCell>
                          <TableCell>{investment.type}</TableCell>
                          <TableCell>{new Date(investment.invested_date).toLocaleDateString()}</TableCell>
                          <TableCell>{format(investment.invested)}</TableCell>
                          <TableCell>{format(investment.current_value || investment.invested)}</TableCell>
                          <TableCell className={investmentPnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {investmentPnl >= 0 ? '+' : ''}{format(investmentPnl)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEditInvestment(investment)}>Edit</Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteInvestment(investment.id)}>Delete</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}