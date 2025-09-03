import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { User, Globe, DollarSign, Receipt } from "lucide-react";
import { useUserData } from "@/context/UserDataContext";
import { useCurrency } from "@/context/CurrencyContext";

const currencyOptions = [
  { code: "INR", symbol: "₹" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "AED", symbol: "د.إ" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { setCurrency } = useCurrency();
  const { userData, updateProfile, updateIncome, updateExpenses, completeOnboarding } = useUserData();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/');
    }
  };

  const progress = (currentStep / totalSteps) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Personal Information</CardTitle>
              <CardDescription>Help us personalize your financial experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Enter your age"
                    value={userData.profile.age || ''}
                    onChange={(e) => updateProfile({ age: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    placeholder="Software Engineer, Teacher, etc."
                    value={userData.profile.occupation}
                    onChange={(e) => updateProfile({ occupation: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="city">Current City</Label>
                <Input
                  id="city"
                  placeholder="Mumbai, Bangalore, New York, etc."
                  value={userData.profile.city}
                  onChange={(e) => updateProfile({ city: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cityTier">City Tier / Economic Level</Label>
                <Select
                  value={userData.profile.cityTier}
                  onValueChange={(value) => updateProfile({ cityTier: value as any })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your city's economic tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tier 1">Tier 1 (Metro cities)</SelectItem>
                    <SelectItem value="Tier 2">Tier 2 (Major cities)</SelectItem>
                    <SelectItem value="Tier 3">Tier 3 (Smaller cities & towns)</SelectItem>
                    <SelectItem value="Rural">Rural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="currency">Preferred Currency</Label>
                <Select
                  value={userData.profile.preferredCurrency}
                  onValueChange={(code) => {
                    updateProfile({ preferredCurrency: code });
                    const item = currencyOptions.find((c) => c.code === code)!;
                    setCurrency(item);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select preferred currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Regional & Financial Settings</CardTitle>
              <CardDescription>Configure your financial preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="financialMonth">Financial Month Start Day</Label>
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
        );

      case 3:
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <CardTitle className="text-2xl">Income & Savings</CardTitle>
              <CardDescription>Tell us about your financial situation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthlyIncome">Your Monthly Income</Label>
                  <Input
                    id="monthlyIncome"
                    type="number"
                    placeholder="Enter your monthly income"
                    value={userData.income.monthlyIncome || ''}
                    onChange={(e) => updateIncome({ monthlyIncome: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="familyIncome">Family Monthly Income (Optional)</Label>
                  <Input
                    id="familyIncome"
                    type="number"
                    placeholder="Enter family income (optional)"
                    value={userData.income.familyMonthlyIncome || ''}
                    onChange={(e) => updateIncome({ familyMonthlyIncome: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="savings">Current Savings</Label>
                  <Input
                    id="savings"
                    type="number"
                    placeholder="Enter current savings"
                    value={userData.income.currentSavings || ''}
                    onChange={(e) => updateIncome({ currentSavings: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="investments">Current Investments</Label>
                  <Input
                    id="investments"
                    type="number"
                    placeholder="Enter current investments"
                    value={userData.income.currentInvestments || ''}
                    onChange={(e) => updateIncome({ currentInvestments: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card className="max-w-4xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-2xl">Fixed Monthly Expenses</CardTitle>
              <CardDescription>Estimate your recurring monthly expenses. These are used for budgeting and financial planning.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="rent">Rent</Label>
                    <Input
                      id="rent"
                      type="number"
                      placeholder="Enter rent amount"
                      value={userData.expenses.rent || ''}
                      onChange={(e) => updateExpenses({ rent: Number(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="transport">Transport</Label>
                    <Input
                      id="transport"
                      type="number"
                      placeholder="Enter transport cost"
                      value={userData.expenses.transport || ''}
                      onChange={(e) => updateExpenses({ transport: Number(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="insurance">Insurance</Label>
                    <Input
                      id="insurance"
                      type="number"
                      placeholder="₹"
                      value={userData.expenses.insurance || ''}
                      onChange={(e) => updateExpenses({ insurance: Number(e.target.value) })}
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
                      placeholder="₹ 6000"
                      value={userData.expenses.groceries || ''}
                      onChange={(e) => updateExpenses({ groceries: Number(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fuel">Fuel</Label>
                    <Input
                      id="fuel"
                      type="number"
                      placeholder="₹"
                      value={userData.expenses.fuel || ''}
                      onChange={(e) => updateExpenses({ fuel: Number(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subscriptions">Subscriptions</Label>
                    <Input
                      id="subscriptions"
                      type="number"
                      placeholder="₹"
                      value={userData.expenses.subscriptions || ''}
                      onChange={(e) => updateExpenses({ subscriptions: Number(e.target.value) })}
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
                      placeholder="₹ 4000"
                      value={userData.expenses.utilities || ''}
                      onChange={(e) => updateExpenses({ utilities: Number(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="internetPhone">Internet Phone</Label>
                    <Input
                      id="internetPhone"
                      type="number"
                      placeholder="₹"
                      value={userData.expenses.internetPhone || ''}
                      onChange={(e) => updateExpenses({ internetPhone: Number(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="domesticHelp">Domestic Help</Label>
                    <Input
                      id="domesticHelp"
                      type="number"
                      placeholder="₹"
                      value={userData.expenses.domesticHelp || ''}
                      onChange={(e) => updateExpenses({ domesticHelp: Number(e.target.value) })}
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
                    placeholder="₹"
                    value={userData.expenses.maintenance || ''}
                    onChange={(e) => updateExpenses({ maintenance: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="other">Other</Label>
                  <Input
                    id="other"
                    type="number"
                    placeholder="₹ 40000"
                    value={userData.expenses.other || ''}
                    onChange={(e) => updateExpenses({ other: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Onboarding – Money Matter</title>
        <meta name="description" content="Complete your financial profile to get personalized insights." />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/onboarding" />
      </Helmet>

      <main className="container py-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground mb-2">Step {currentStep} of {totalSteps}</p>
            <div className="text-sm text-muted-foreground mb-4">{Math.round(progress)}% Complete</div>
            <Progress value={progress} className="max-w-md mx-auto mb-6" />
          </div>

          {renderStep()}

          <div className="flex items-center justify-between mt-8 max-w-2xl mx-auto">
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button onClick={handleNext}>
              {currentStep === totalSteps ? 'Complete Setup' : 'Continue'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
