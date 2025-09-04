import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, User, Globe, DollarSign, Receipt, LogOut, Trash2 } from "lucide-react";
import { useUserData } from "@/context/UserDataContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Settings() {
  const { userData, updateProfile, updateIncome, updateExpenses, resetUserData } = useUserData();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleResetSetup = () => {
    if (confirm('Are you sure you want to reset all your setup? This will take you back to the onboarding process.')) {
      resetUserData();
      navigate('/onboarding');
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      // In a real app, this would clear authentication tokens
      console.log('Logging out...');
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      resetUserData();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Settings – Money Matter</title>
        <meta name="description" content="Manage your account and preferences" />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/settings" />
      </Helmet>

      <div className="md:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleResetSetup}>
                Reset Setup
              </Button>
              <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span>Profile Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      value={userData.profile.fullName}
                      onChange={(e) => updateProfile({ fullName: e.target.value })}
                      placeholder="Parth Chavan"
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={userData.profile.email}
                      onChange={(e) => updateProfile({ email: e.target.value })}
                      placeholder="chavanparth1@gmail.com"
                      className="mt-1" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input 
                      id="age" 
                      type="number"
                      value={userData.profile.age || ''}
                      onChange={(e) => updateProfile({ age: Number(e.target.value) })}
                      placeholder="23"
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input 
                      id="occupation" 
                      value={userData.profile.occupation}
                      onChange={(e) => updateProfile({ occupation: e.target.value })}
                      placeholder="Software Engineer"
                      className="mt-1" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Regional & Financial Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-green-600" />
                  <span>Regional & Financial Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input 
                      id="city" 
                      value={userData.profile.city}
                      onChange={(e) => updateProfile({ city: e.target.value })}
                      placeholder="Chiplun"
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="cityTier">City Tier</Label>
                    <Select 
                      value={userData.profile.cityTier} 
                      onValueChange={(value) => updateProfile({ cityTier: value as any })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tier 1">Tier 1 (Metro cities)</SelectItem>
                        <SelectItem value="Tier 2">Tier 2 (Major cities)</SelectItem>
                        <SelectItem value="Tier 3">Tier 3 (Smaller cities & towns)</SelectItem>
                        <SelectItem value="Rural">Rural</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preferredCurrency">Preferred Currency</Label>
                    <Select 
                      value={userData.profile.preferredCurrency} 
                      onValueChange={(value) => updateProfile({ preferredCurrency: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">₹ Indian Rupee (INR)</SelectItem>
                        <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                        <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                        <SelectItem value="AED">د.إ UAE Dirham (AED)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="financialMonthStart">Financial Month Start Day</Label>
                    <Select 
                      value={userData.profile.financialMonthStartDay.toString()} 
                      onValueChange={(value) => updateProfile({ financialMonthStartDay: Number(value) })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Income & Savings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                  <span>Income & Savings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="monthlyIncome">Your Monthly Income</Label>
                    <Input 
                      id="monthlyIncome" 
                      type="number"
                      value={userData.income.monthlyIncome || ''}
                      onChange={(e) => updateIncome({ monthlyIncome: Number(e.target.value) })}
                      placeholder="70000"
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="familyIncome">Family Monthly Income (Optional)</Label>
                    <Input 
                      id="familyIncome" 
                      type="number"
                      value={userData.income.familyMonthlyIncome || ''}
                      onChange={(e) => updateIncome({ familyMonthlyIncome: Number(e.target.value) })}
                      placeholder="80000"
                      className="mt-1" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currentSavings">Current Savings</Label>
                    <Input 
                      id="currentSavings" 
                      type="number"
                      value={userData.income.currentSavings || ''}
                      onChange={(e) => updateIncome({ currentSavings: Number(e.target.value) })}
                      placeholder="150000"
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentInvestments">Current Investments</Label>
                    <Input 
                      id="currentInvestments" 
                      type="number"
                      value={userData.income.currentInvestments || ''}
                      onChange={(e) => updateIncome({ currentInvestments: Number(e.target.value) })}
                      placeholder="100000"
                      className="mt-1" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fixed Monthly Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Receipt className="w-5 h-5 text-red-600" />
                  <span>Fixed Monthly Expenses</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Estimate your recurring monthly expenses. These are used for budgeting and financial planning.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="rent">Rent</Label>
                      <Input 
                        id="rent" 
                        type="number"
                        value={userData.expenses.rent || ''}
                        onChange={(e) => updateExpenses({ rent: Number(e.target.value) })}
                        placeholder="₹"
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="transport">Transport</Label>
                      <Input 
                        id="transport" 
                        type="number"
                        value={userData.expenses.transport || ''}
                        onChange={(e) => updateExpenses({ transport: Number(e.target.value) })}
                        placeholder="0"
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="insurance">Insurance</Label>
                      <Input 
                        id="insurance" 
                        type="number"
                        value={userData.expenses.insurance || ''}
                        onChange={(e) => updateExpenses({ insurance: Number(e.target.value) })}
                        placeholder="₹"
                        className="mt-1" 
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="groceries">Groceries</Label>
                      <Input 
                        id="groceries" 
                        type="number"
                        value={userData.expenses.groceries || ''}
                        onChange={(e) => updateExpenses({ groceries: Number(e.target.value) })}
                        placeholder="0"
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="fuel">Fuel</Label>
                      <Input 
                        id="fuel" 
                        type="number"
                        value={userData.expenses.fuel || ''}
                        onChange={(e) => updateExpenses({ fuel: Number(e.target.value) })}
                        placeholder="₹"
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="subscriptions">Subscriptions</Label>
                      <Input 
                        id="subscriptions" 
                        type="number"
                        value={userData.expenses.subscriptions || ''}
                        onChange={(e) => updateExpenses({ subscriptions: Number(e.target.value) })}
                        placeholder="₹"
                        className="mt-1" 
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="utilities">Utilities</Label>
                      <Input 
                        id="utilities" 
                        type="number"
                        value={userData.expenses.utilities || ''}
                        onChange={(e) => updateExpenses({ utilities: Number(e.target.value) })}
                        placeholder="0"
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="internetPhone">Internet Phone</Label>
                      <Input 
                        id="internetPhone" 
                        type="number"
                        value={userData.expenses.internetPhone || ''}
                        onChange={(e) => updateExpenses({ internetPhone: Number(e.target.value) })}
                        placeholder="₹"
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="domesticHelp">Domestic Help</Label>
                      <Input 
                        id="domesticHelp" 
                        type="number"
                        value={userData.expenses.domesticHelp || ''}
                        onChange={(e) => updateExpenses({ domesticHelp: Number(e.target.value) })}
                        placeholder="₹"
                        className="mt-1" 
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div>
                    <Label htmlFor="maintenance">Maintenance</Label>
                    <Input 
                      id="maintenance" 
                      type="number"
                      value={userData.expenses.maintenance || ''}
                      onChange={(e) => updateExpenses({ maintenance: Number(e.target.value) })}
                      placeholder="₹"
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="other">Other</Label>
                    <Input 
                      id="other" 
                      type="number"
                      value={userData.expenses.other || ''}
                      onChange={(e) => updateExpenses({ other: Number(e.target.value) })}
                      placeholder="0"
                      className="mt-1" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <SettingsIcon className="w-5 h-5 text-gray-600" />
                  <span>Account Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Logout</div>
                    <div className="text-sm text-muted-foreground">Sign out of your account</div>
                  </div>
                  <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-red-600">Delete Account</div>
                    <div className="text-sm text-muted-foreground">Permanently delete your account and all data</div>
                  </div>
                  <Button variant="destructive" onClick={handleDeleteAccount}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}