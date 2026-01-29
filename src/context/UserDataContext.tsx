import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

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
  loading: boolean;
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
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData>(defaultUserData);
  const [loading, setLoading] = useState(true);

  // Load user data from Supabase when user is authenticated
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setUserData(defaultUserData);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading user data:', error);
          setLoading(false);
          return;
        }

        if (data) {
          const loadedUserData: UserData = {
            profile: {
              fullName: data.full_name || '',
              email: data.email || '',
              age: data.age || 0,
              occupation: data.employment_status || '',
              city: data.location || '',
              cityTier: 'Tier 1',
              preferredCurrency: data.currency_code || 'INR',
              financialMonthStartDay: 1,
            },
            income: {
              monthlyIncome: Number(data.monthly_income) || 0,
              familyMonthlyIncome: Number(data.monthly_income) || 0,
              currentSavings: Number(data.monthly_savings) || 0,
              currentInvestments: Number(data.investment_amount) || 0,
            },
            expenses: data.monthly_expenses ? { 
              ...defaultUserData.expenses, 
              ...(data.monthly_expenses as Record<string, number>) 
            } : defaultUserData.expenses,
            isOnboardingCompleted: data.onboarding_completed || false,
          };
          setUserData(loadedUserData);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const saveToSupabase = async (updatedData: UserData) => {
    if (!user) return;

    try {
      const profileData = {
        user_id: user.id,
        full_name: updatedData.profile.fullName,
        email: updatedData.profile.email,
        age: updatedData.profile.age,
        employment_status: updatedData.profile.occupation,
        location: updatedData.profile.city,
        currency_code: updatedData.profile.preferredCurrency,
        monthly_income: updatedData.income.monthlyIncome,
        monthly_savings: updatedData.income.currentSavings,
        investment_amount: updatedData.income.currentInvestments,
        monthly_expenses: updatedData.expenses as any,
        onboarding_completed: updatedData.isOnboardingCompleted,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' });
      if (error) {
        console.error('Error saving user data:', error);
      }
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    const updatedData = {
      ...userData,
      profile: { ...userData.profile, ...profile }
    };
    setUserData(updatedData);
    saveToSupabase(updatedData);
  };

  const updateIncome = (income: Partial<IncomeData>) => {
    const updatedData = {
      ...userData,
      income: { ...userData.income, ...income }
    };
    setUserData(updatedData);
    saveToSupabase(updatedData);
  };

  const updateExpenses = (expenses: Partial<ExpenseData>) => {
    const updatedData = {
      ...userData,
      expenses: { ...userData.expenses, ...expenses }
    };
    setUserData(updatedData);
    saveToSupabase(updatedData);
  };

  const completeOnboarding = () => {
    const updatedData = {
      ...userData,
      isOnboardingCompleted: true
    };
    setUserData(updatedData);
    saveToSupabase(updatedData);
  };

  const resetUserData = () => {
    setUserData(defaultUserData);
    if (user) {
      saveToSupabase(defaultUserData);
    }
  };

  return (
    <UserDataContext.Provider
      value={{
        userData,
        loading,
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
