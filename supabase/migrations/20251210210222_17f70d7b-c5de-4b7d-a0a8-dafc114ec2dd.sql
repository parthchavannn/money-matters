-- Create recurring_transactions table
CREATE TABLE public.recurring_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_occurrence DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own recurring transactions"
ON public.recurring_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring transactions"
ON public.recurring_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring transactions"
ON public.recurring_transactions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring transactions"
ON public.recurring_transactions
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_recurring_transactions_updated_at
BEFORE UPDATE ON public.recurring_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();