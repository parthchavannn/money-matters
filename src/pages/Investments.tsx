import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, BarChart3, Plus, RefreshCw } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/context/UserDataContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
export default function Investments() {
  const { format } = useCurrency();
  const { user } = useAuth();
  const { userData } = useUserData();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invDialogOpen, setInvDialogOpen] = useState(false);
  const [newInv, setNewInv] = useState({
    name: '',
    type: 'Stock',
    invested_date: new Date().toISOString().slice(0,10),
    invested: 0,
    current_value: 0,
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
    try {
      const { data, error } = await supabase
        .from('investments')
        .insert({
          user_id: user.id,
          name: newInv.name.trim(),
          type: newInv.type,
          invested_date: newInv.invested_date,
          invested: Number(newInv.invested) || 0,
          current_value: Number(newInv.current_value) || null,
        })
        .select()
        .single();
      if (error) throw error;
      setInvestments((prev) => [data as any, ...prev]);
      setInvDialogOpen(false);
      setNewInv({ name: '', type: 'Stock', invested_date: new Date().toISOString().slice(0,10), invested: 0, current_value: 0 });
      toast({ title: 'Investment logged' });
    } catch (e) {
      console.error('Error adding investment:', e);
      toast({ title: 'Failed to add investment', variant: 'destructive' });
    }
  };

  const totalInvested = investments.reduce((sum: number, inv: any) => sum + Number(inv.invested || 0), 0);
  const currentValue = investments.reduce((sum: number, inv: any) => sum + Number(inv.current_value || inv.invested || 0), 0);
  const pnl = currentValue - totalInvested;
  const availableToInvest = Math.max(0, (userData.income?.monthlyIncome || 0) - Object.values(userData.expenses || {}).reduce((s, v) => s + (v || 0), 0));

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
            <Button className="bg-black hover:bg-gray-800" onClick={() => setInvDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Log Investment
            </Button>
          </div>

          <Dialog open={invDialogOpen} onOpenChange={setInvDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Investment</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Name</Label>
                  <Input value={newInv.name} onChange={(e) => setNewInv({ ...newInv, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select value={newInv.type} onValueChange={(v) => setNewInv({ ...newInv, type: v })}>
                      <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stock">Stock</SelectItem>
                        <SelectItem value="Mutual Fund">Mutual Fund</SelectItem>
                        <SelectItem value="Crypto">Crypto</SelectItem>
                        <SelectItem value="Bond">Bond</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={newInv.invested_date} onChange={(e) => setNewInv({ ...newInv, invested_date: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Invested</Label>
                    <Input type="number" value={newInv.invested} onChange={(e) => setNewInv({ ...newInv, invested: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Current Value</Label>
                    <Input type="number" value={newInv.current_value} onChange={(e) => setNewInv({ ...newInv, current_value: Number(e.target.value) })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInvDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateInvestment}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-gray-500" />
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
                  <TrendingDown className="w-5 h-5 text-gray-500" />
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
                  <RefreshCw className="w-5 h-5 text-blue-600" />
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
                            <Button variant="ghost" size="sm">Edit</Button>
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