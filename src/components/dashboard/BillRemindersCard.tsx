import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, AlertTriangle, Clock } from "lucide-react";
import { differenceInDays, format, isToday, isTomorrow, isThisWeek } from "date-fns";

interface Reminder {
  id: string;
  title: string;
  amount: number;
  dueDate: Date;
  type: 'recurring' | 'debt';
  category?: string;
}

interface BillRemindersCardProps {
  reminders: Reminder[];
  formatCurrency: (amount: number) => string;
}

export function BillRemindersCard({ reminders, formatCurrency }: BillRemindersCardProps) {
  const getUrgencyBadge = (dueDate: Date) => {
    if (isToday(dueDate)) {
      return <Badge variant="destructive" className="text-xs">Today</Badge>;
    }
    if (isTomorrow(dueDate)) {
      return <Badge className="bg-amber-500 hover:bg-amber-600 text-xs">Tomorrow</Badge>;
    }
    const days = differenceInDays(dueDate, new Date());
    if (days <= 7) {
      return <Badge variant="secondary" className="text-xs">In {days} days</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{format(dueDate, 'MMM d')}</Badge>;
  };

  const getIcon = (type: string) => {
    return type === 'debt' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <Clock className="w-4 h-4 text-blue-500" />;
  };

  const sortedReminders = [...reminders].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const upcomingReminders = sortedReminders.slice(0, 5);

  const todayCount = reminders.filter(r => isToday(r.dueDate)).length;
  const weekCount = reminders.filter(r => isThisWeek(r.dueDate, { weekStartsOn: 1 })).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <span>Bill Reminders</span>
          </span>
          {todayCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {todayCount} due today
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingReminders.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">No upcoming bills</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Summary */}
            <div className="flex items-center justify-between text-sm text-muted-foreground pb-2 border-b">
              <span>{weekCount} due this week</span>
              <span>Total: {formatCurrency(reminders.reduce((sum, r) => sum + r.amount, 0))}</span>
            </div>

            {/* Reminder list */}
            {upcomingReminders.map((reminder) => (
              <div
                key={`${reminder.type}-${reminder.id}`}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  isToday(reminder.dueDate)
                    ? 'bg-destructive/10 border border-destructive/20'
                    : isTomorrow(reminder.dueDate)
                    ? 'bg-amber-500/10 border border-amber-500/20'
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {getIcon(reminder.type)}
                  <div>
                    <p className="font-medium text-sm">{reminder.title}</p>
                    {reminder.category && (
                      <p className="text-xs text-muted-foreground">{reminder.category}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">{formatCurrency(reminder.amount)}</span>
                  {getUrgencyBadge(reminder.dueDate)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
