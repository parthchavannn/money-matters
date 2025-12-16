import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, CreditCard, Target, Receipt, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { format, isSameDay, isWithinInterval, addDays, startOfMonth, endOfMonth } from "date-fns";

interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  amount: number;
  type: "bill" | "debt" | "goal";
  description?: string;
}

export default function FinancialCalendar() {
  const { format: formatCurrency } = useCurrency();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [recurringRes, debtsRes, goalsRes] = await Promise.all([
      supabase
        .from("recurring_transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true),
      supabase
        .from("debts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active"),
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
    ]);

    const calendarEvents: CalendarEvent[] = [];

    // Add recurring transactions as bills
    (recurringRes.data || []).forEach(t => {
      if (t.next_occurrence) {
        calendarEvents.push({
          id: `bill-${t.id}`,
          date: new Date(t.next_occurrence),
          title: t.description || t.category,
          amount: Number(t.amount),
          type: "bill",
          description: `${t.frequency} ${t.transaction_type}`
        });
      }
    });

    // Add debt due dates
    (debtsRes.data || []).forEach(d => {
      if (d.due_date) {
        calendarEvents.push({
          id: `debt-${d.id}`,
          date: new Date(d.due_date),
          title: d.creditor_name,
          amount: Number(d.monthly_payment) || Number(d.minimum_payment) || 0,
          type: "debt",
          description: `${d.debt_type} - ${formatCurrency(Number(d.remaining_amount))} remaining`
        });
      }
    });

    // Add goal target dates as milestones
    (goalsRes.data || []).forEach(g => {
      if (g.target_date) {
        calendarEvents.push({
          id: `goal-${g.id}`,
          date: new Date(g.target_date),
          title: g.title,
          amount: Number(g.target_amount),
          type: "goal",
          description: `${Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)}% complete`
        });
      }
    });

    setEvents(calendarEvents);
    setLoading(false);
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(e => isSameDay(e.date, date));
  };

  const upcomingEvents = events
    .filter(e => isWithinInterval(e.date, { start: new Date(), end: addDays(new Date(), 30) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const selectedDateEvents = getEventsForDate(selectedDate);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "bill": return <Receipt className="h-4 w-4" />;
      case "debt": return <CreditCard className="h-4 w-4" />;
      case "goal": return <Target className="h-4 w-4" />;
      default: return <CalendarDays className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "bill": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "debt": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "goal": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const eventDates = events.map(e => e.date);

  return (
    <>
      <Helmet>
        <title>Financial Calendar | Finance Tracker</title>
      </Helmet>

      <div className="space-y-6 pb-20 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Financial Calendar
          </h1>
          <p className="text-muted-foreground text-sm">Track bills, debt payments, and goal milestones</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading calendar...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2">
              <CardContent className="p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md"
                  modifiers={{
                    hasEvent: eventDates
                  }}
                  modifiersStyles={{
                    hasEvent: { 
                      fontWeight: "bold",
                      textDecoration: "underline",
                      textDecorationColor: "hsl(var(--primary))"
                    }
                  }}
                />

                {/* Selected Date Events */}
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-medium mb-3">
                    {format(selectedDate, "MMMM d, yyyy")}
                  </h3>
                  {selectedDateEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events on this date</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDateEvents.map(event => (
                        <div 
                          key={event.id}
                          className={`p-3 rounded-lg border ${getEventColor(event.type)}`}
                        >
                          <div className="flex items-center gap-2">
                            {getEventIcon(event.type)}
                            <span className="font-medium">{event.title}</span>
                          </div>
                          <div className="flex justify-between mt-1 text-sm">
                            <span>{event.description}</span>
                            <span className="font-semibold">{formatCurrency(event.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  Upcoming (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                ) : (
                  upcomingEvents.map(event => (
                    <div 
                      key={event.id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedDate(event.date)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {getEventIcon(event.type)}
                          <span className="font-medium text-sm">{event.title}</span>
                        </div>
                        <Badge variant="outline" className={getEventColor(event.type)}>
                          {event.type}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{format(event.date, "MMM d")}</span>
                        <span className="font-medium">{formatCurrency(event.amount)}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Legend */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm">Bills & Recurring</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">Debt Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm">Goal Milestones</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
