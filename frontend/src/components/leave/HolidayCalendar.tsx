import { useEffect, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { CalendarDays, Info } from 'lucide-react';

interface CompanyHoliday {
  id: string;
  holiday_date: string;
  name: string;
  description: string | null;
}

interface HolidayCalendarProps {
  selectedDates?: { start?: Date; end?: Date };
  onDateSelect?: (date: Date | undefined) => void;
}

export function HolidayCalendar({ selectedDates, onDateSelect }: HolidayCalendarProps) {
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchHolidays();
  }, [currentMonth]);

  const fetchHolidays = async () => {
    const year = currentMonth.getFullYear();
    try {
      const { data, error } = await supabase
        .from('company_holidays')
        .select('*')
        .eq('year', year)
        .order('holiday_date', { ascending: true });

      if (error) throw error;
      setHolidays(data || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const holidayDates = holidays.map(h => parseISO(h.holiday_date));

  const getHolidayForDate = (date: Date): CompanyHoliday | undefined => {
    return holidays.find(h => isSameDay(parseISO(h.holiday_date), date));
  };

  const modifiers = {
    holiday: holidayDates,
    weekend: (date: Date) => date.getDay() === 0 || date.getDay() === 6,
  };

  const modifiersStyles = {
    holiday: {
      backgroundColor: 'hsl(var(--destructive) / 0.15)',
      color: 'hsl(var(--destructive))',
      fontWeight: 600,
    },
    weekend: {
      backgroundColor: 'hsl(var(--muted))',
      color: 'hsl(var(--muted-foreground))',
    },
  };

  // Get upcoming holidays (next 5)
  const upcomingHolidays = holidays
    .filter(h => parseISO(h.holiday_date) >= new Date())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="w-5 h-5 text-primary" />
          ปฏิทินวันหยุด
        </CardTitle>
        <CardDescription>
          วันหยุดบริษัทและวันหยุดสุดสัปดาห์จะไม่ถูกนับในการลา
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
        ) : (
          <>
            <Calendar
              mode="single"
              selected={selectedDates?.start}
              onSelect={onDateSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-md border p-2 sm:p-3 w-full [&_.rdp-months]:w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-head_row]:flex [&_.rdp-head_row]:justify-between [&_.rdp-row]:flex [&_.rdp-row]:justify-between [&_.rdp-cell]:flex-1 [&_.rdp-head_cell]:flex-1 [&_.rdp-day]:w-full [&_.rdp-day]:h-8 sm:[&_.rdp-day]:h-10"
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-destructive/15 border border-destructive/30" />
                <span className="text-muted-foreground">วันหยุดบริษัท</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted border" />
                <span className="text-muted-foreground">วันหยุดสุดสัปดาห์</span>
              </div>
            </div>

            {/* Upcoming holidays */}
            {upcomingHolidays.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <Info className="w-4 h-4" />
                  วันหยุดที่จะถึง
                </p>
                <div className="space-y-1">
                  {upcomingHolidays.map((holiday) => (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                    >
                      <span className="font-medium">{holiday.name}</span>
                      <Badge variant="secondary">
                        {format(parseISO(holiday.holiday_date), 'd MMM', { locale: th })}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
