import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  fullName: string;
  email: string;
  age: number;
  occupation: string;
  city: string;
  cityTier: 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Rural';
  preferredCurrency: string;
  financialMonthStartDay: number;
}

export interface IncomeData {
  monthlyIncome: number;
  familyMonthlyIncome: number;
  currentSavings: number;
  currentInvestments: number;
}

export interface ExpenseData {
  rent: number;
  groceries: number;
  utilities: number;
  transport: number;
  fuel: number;
  internetPhone: number;
  insurance: number;
  subscriptions: number;
  domesticHelp: number;
  maintenance: number;
  other: number;
}

export interface UserData {
  profile: UserProfile;
  income: IncomeData;
  expenses: ExpenseData;
  isOnboardingCompleted: boolean;
}

interface UserDataContextValue {
  userData: UserData;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateIncome: (income: Partial<IncomeData>) => void;
  updateExpenses: (expenses: Partial<ExpenseData>) => void;
  completeOnboarding: () => void;
  resetUserData: () => void;
}

const defaultUserData: UserData = {
  profile: {
    fullName: '',
    email: '',
    age: 0,
    occupation: '',
    city: '',
    cityTier: 'Tier 1',
    preferredCurrency: 'INR',
    financialMonthStartDay: 1,
  },
  income: {
    monthlyIncome: 0,
    familyMonthlyIncome: 0,
    currentSavings: 0,
    currentInvestments: 0,
  },
  expenses: {
    rent: 0,
    groceries: 0,
    utilities: 0,
    transport: 0,
    fuel: 0,
    internetPhone: 0,
    insurance: 0,
    subscriptions: 0,
    domesticHelp: 0,
    maintenance: 0,
    other: 0,
  },
  isOnboardingCompleted: false,
};

const UserDataContext = createContext<UserDataContextValue | undefined>(undefined);

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<UserData>(() => {
    const saved = localStorage.getItem('moneyMatterUserData');
    return saved ? JSON.parse(saved) : defaultUserData;
  });

  useEffect(() => {
    localStorage.setItem('moneyMatterUserData', JSON.stringify(userData));
  }, [userData]);

  const updateProfile = (profile: Partial<UserProfile>) => {
    setUserData(prev => ({
      ...prev,
      profile: { ...prev.profile, ...profile }
    }));
  };

  const updateIncome = (income: Partial<IncomeData>) => {
    setUserData(prev => ({
      ...prev,
      income: { ...prev.income, ...income }
    }));
  };

  const updateExpenses = (expenses: Partial<ExpenseData>) => {
    setUserData(prev => ({
      ...prev,
      expenses: { ...prev.expenses, ...expenses }
    }));
  };

  const completeOnboarding = () => {
    setUserData(prev => ({
      ...prev,
      isOnboardingCompleted: true
    }));
  };

  const resetUserData = () => {
    setUserData(defaultUserData);
    localStorage.removeItem('moneyMatterUserData');
  };

  return (
    <UserDataContext.Provider
      value={{
        userData,
        updateProfile,
        updateIncome,
        updateExpenses,
        completeOnboarding,
        resetUserData,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
};

export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};