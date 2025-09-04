import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, TrendingUp, Calendar, Edit, Check, Trash2 } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface Goal {
  id: string;
  title: string;
  category: string;
  priority: string;
  current_amount: number;
  target_amount: number;
  target_date: string;
  status: string;
}

export default function Goals() {
  const { format } = useCurrency();
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [newGoal, setNewGoal] = useState({
    title: '',
    category: '',
    target_amount: '',
    current_amount: '',
    priority: 'medium',
    target_date: ''
  });

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!user) return;

    const goalData = {
      user_id: user.id,
      title: newGoal.title,
      category: newGoal.category,
      target_amount: parseFloat(newGoal.target_amount),
      current_amount: parseFloat(newGoal.current_amount) || 0,
      priority: newGoal.priority,
      target_date: newGoal.target_date || null,
      status: 'active'
    };

    if (editingGoal) {
      const { data, error } = await supabase
        .from('goals')
        .update(goalData)
        .eq('id', editingGoal.id)
        .select();

      if (error) {
        console.error('Error updating goal:', error);
        return;
      }

      if (data) {
        setGoals(goals.map(g => g.id === editingGoal.id ? data[0] : g));
        resetForm();
      }
    } else {
      const { data, error } = await supabase
        .from('goals')
        .insert([goalData])
        .select();

      if (error) {
        console.error('Error creating goal:', error);
        return;
      }

      if (data) {
        setGoals([...goals, data[0]]);
        resetForm();
      }
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setNewGoal({
      title: goal.title,
      category: goal.category || '',
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      priority: goal.priority || 'medium',
      target_date: goal.target_date || ''
    });
    setShowDialog(true);
  };

  const handleDeleteGoal = async (goalId: string) => {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId);

    if (error) {
      console.error('Error deleting goal:', error);
      return;
    }

    setGoals(goals.filter(g => g.id !== goalId));
  };

  const resetForm = () => {
    setNewGoal({
      title: '',
      category: '',
      target_amount: '',
      current_amount: '',
      priority: 'medium',
      target_date: ''
    });
    setEditingGoal(null);
    setShowDialog(false);
  };

  const calculateProgress = (current: number, target: number) => {
    return target > 0 ? Math.round((current / target) * 100) : 0;
  };

  const totalTarget = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
  const totalSaved = goals.reduce((sum, goal) => sum + goal.current_amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Financial Goals – Money Matter</title>
        <meta name="description" content="Track your progress toward your dreams" />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/goals" />
      </Helmet>

      <div className="md:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financial Goals</h1>
              <p className="text-gray-600">Track your progress toward your dreams</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Goal
            </Button>
          </div>

        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
          <DialogContent className="sm:max-w-[425px]" aria-describedby="goal-dialog-description">
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Edit Goal' : 'Add New Goal'}</DialogTitle>
              <DialogDescription id="goal-dialog-description">
                {editingGoal ? 'Update your financial goal details below.' : 'Enter details for your new financial goal.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Goal Title</Label>
                <Input
                  id="title"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                  placeholder="Emergency fund, vacation, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={newGoal.category} onValueChange={(value) => setNewGoal({...newGoal, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emergency">Emergency Fund</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="home">Home & Property</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="retirement">Retirement</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newGoal.priority} onValueChange={(value) => setNewGoal({...newGoal, priority: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="target_amount">Target Amount</Label>
                  <Input
                    id="target_amount"
                    type="number"
                    value={newGoal.target_amount}
                    onChange={(e) => setNewGoal({...newGoal, target_amount: e.target.value})}
                    placeholder="0"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="current_amount">Current Amount</Label>
                  <Input
                    id="current_amount"
                    type="number"
                    value={newGoal.current_amount}
                    onChange={(e) => setNewGoal({...newGoal, current_amount: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="target_date">Target Date</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={newGoal.target_date}
                  onChange={(e) => setNewGoal({...newGoal, target_date: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => resetForm()}>
                Cancel
              </Button>
              <Button onClick={handleCreateGoal}>
                {editingGoal ? 'Update Goal' : 'Create Goal'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-green-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <CardTitle className="text-lg">Active Goals</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{goals.length}</div>
              </CardContent>
            </Card>

            <Card className="bg-blue-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <CardTitle className="text-lg">Total Target</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{format(totalTarget)}</div>
              </CardContent>
            </Card>

            <Card className="bg-purple-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <CardTitle className="text-lg">Total Saved</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{format(totalSaved)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Goals</h2>
            {loading ? (
              <div className="text-center py-8">Loading goals...</div>
            ) : goals.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-gray-500 mb-4">
                  <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No goals found. Start by adding your first financial goal!</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Goal
                </Button>
              </Card>
            ) : (
              <div className="space-y-6">
                {goals.map((goal) => {
                  const progress = calculateProgress(goal.current_amount, goal.target_amount);
                  const targetDate = goal.target_date ? new Date(goal.target_date).toLocaleDateString() : 'No date set';
                  
                  return (
                    <Card key={goal.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">🎯</div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={goal.priority === "high" ? "destructive" : "secondary"}>
                                {goal.priority} priority
                              </Badge>
                              <Badge variant="outline">{goal.category}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditGoal(goal)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteGoal(goal.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Progress</span>
                          <span className="text-sm font-medium">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gray-900 h-2 rounded-full" 
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Current Amount</div>
                          <div className="font-semibold">{format(goal.current_amount)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Target Amount</div>
                          <div className="font-semibold">{format(goal.target_amount)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Target Date</div>
                          <div className="font-semibold">{targetDate}</div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}