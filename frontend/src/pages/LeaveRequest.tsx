import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Plus, X, FileText, Baby, Heart, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { LeaveRequest, LeaveType, LeaveEntitlement } from '@/types/hr';
import { leaveTypeLabels } from '@/types/hr';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { validateLeaveRequest } from '@/lib/leaveCalculation';
import { HolidayCalendar } from '@/components/leave/HolidayCalendar';
import { TeamLeaveCalendar } from '@/components/leave/TeamLeaveCalendar';
import { LeaveRulesInfo } from '@/components/leave/LeaveRulesInfo';
import { LeaveTimeSelector } from '@/components/leave/LeaveTimeSelector';


interface LeaveBalanceItem {
  key: LeaveType;
  label: string;
  color: string;
  icon?: React.ElementType;
  quota: number;
  used: number;
  remaining: number;
  isProrated: boolean;
}

export default function LeaveRequestPage() {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);
  const [balanceCards, setBalanceCards] = useState<LeaveBalanceItem[]>([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('balance');
  
  // Time selection states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<'morning' | 'afternoon' | null>(null);
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('17:30');
  const [calculatedPartialDays, setCalculatedPartialDays] = useState(1);
  
  // Validation states
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [calculatedWorkingDays, setCalculatedWorkingDays] = useState<number>(0);

  const isSingleDay = startDate && endDate && startDate === endDate;

  // Real-time validation when dates or leave type changes
  useEffect(() => {
    const validateForm = async () => {
      if (!startDate || !endDate || !selectedLeaveType) {
        setValidationError(null);
        setValidationWarnings([]);
        setCalculatedWorkingDays(0);
        return;
      }

      setIsValidating(true);
      try {
        const balance = balanceCards.find(b => b.key === selectedLeaveType);
        const remainingBalance = balance?.remaining;
        
        const validation = await validateLeaveRequest(
          startDate, 
          endDate, 
          selectedLeaveType, 
          remainingBalance,
          isHalfDay,
          startTime,
          endTime
        );
        
        if (!validation.isValid) {
          setValidationError(validation.message || 'ไม่สามารถยื่นคำขอลาได้');
          setCalculatedWorkingDays(0);
        } else {
          setValidationError(null);
          // For single day, use calculated partial days
          if (isSingleDay) {
            setCalculatedWorkingDays(calculatedPartialDays);
          } else {
            setCalculatedWorkingDays(validation.workingDays);
          }
        }
        
        setValidationWarnings(validation.warnings || []);
      } catch (error) {
        console.error('Validation error:', error);
      } finally {
        setIsValidating(false);
      }
    };

    validateForm();
  }, [startDate, endDate, selectedLeaveType, balanceCards, isHalfDay, startTime, endTime, calculatedPartialDays, isSingleDay]);

  useEffect(() => {
    if (employee) {
      fetchLeaveRequests();
      fetchEntitlements();
    }
  }, [employee]);

  const fetchLeaveRequests = async () => {
    if (!employee) return;
    
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeaveRequests(data || []);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntitlements = async () => {
    if (!employee) return;

    const currentYear = new Date().getFullYear();
    
    // Try to fetch from leave_entitlements table first
    const { data: entitlementData, error } = await supabase
      .from('leave_entitlements')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('year', currentYear);

    if (error) {
      console.error('Error fetching entitlements:', error);
    }

    // If no entitlements exist, try to recalculate
    if (!entitlementData || entitlementData.length === 0) {
      // Call recalculate function
      await supabase.rpc('recalculate_employee_entitlements', {
        p_employee_id: employee.id,
        p_year: currentYear,
      });

      // Fetch again
      const { data: refreshedData } = await supabase
        .from('leave_entitlements')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('year', currentYear);

      if (refreshedData && refreshedData.length > 0) {
        setEntitlements(refreshedData as LeaveEntitlement[]);
        buildBalanceCards(refreshedData as LeaveEntitlement[]);
        return;
      }
    } else {
      setEntitlements(entitlementData as LeaveEntitlement[]);
      buildBalanceCards(entitlementData as LeaveEntitlement[]);
      return;
    }

    // Fallback to employee quotas if no entitlements
    const fallbackCards: LeaveBalanceItem[] = [
      { key: 'vacation', label: 'ลาพักร้อน', color: 'bg-info', quota: employee.annual_leave_quota, used: 0, remaining: employee.annual_leave_quota, isProrated: true },
      { key: 'sick', label: 'ลาป่วย', color: 'bg-warning', quota: employee.sick_leave_quota, used: 0, remaining: employee.sick_leave_quota, isProrated: true },
      { key: 'personal', label: 'ลากิจ', color: 'bg-success', quota: employee.personal_leave_quota, used: 0, remaining: employee.personal_leave_quota, isProrated: true },
      { key: 'other', label: 'ลาอื่นๆ', color: 'bg-muted-foreground', quota: employee.other_leave_quota, used: 0, remaining: employee.other_leave_quota, isProrated: true },
    ];
    setBalanceCards(fallbackCards);
  };

  const buildBalanceCards = (data: LeaveEntitlement[]) => {
    const leaveTypeConfig: Record<string, { label: string; color: string; icon?: React.ElementType; order: number }> = {
      vacation: { label: 'ลาพักร้อน', color: 'bg-info', order: 1 },
      sick: { label: 'ลาป่วย', color: 'bg-warning', order: 2 },
      personal: { label: 'ลากิจ', color: 'bg-success', order: 3 },
      maternity: { label: 'ลาคลอด', color: 'bg-pink-500', icon: Baby, order: 4 },
      paternity: { label: 'ลาช่วยภรรยาคลอด', color: 'bg-blue-500', icon: Heart, order: 5 },
      other: { label: 'ลาอื่นๆ', color: 'bg-muted-foreground', order: 6 },
    };

    const cards: LeaveBalanceItem[] = data
      .filter(ent => ent.prorated_quota > 0) // Only show types with quota > 0
      .map(ent => ({
        key: ent.leave_type,
        label: leaveTypeConfig[ent.leave_type]?.label || ent.leave_type,
        color: leaveTypeConfig[ent.leave_type]?.color || 'bg-muted',
        icon: leaveTypeConfig[ent.leave_type]?.icon,
        quota: Number(ent.prorated_quota),
        used: Number(ent.used_days),
        remaining: Number(ent.remaining_days),
        isProrated: ent.base_quota !== ent.prorated_quota,
      }))
      .sort((a, b) => (leaveTypeConfig[a.key]?.order || 99) - (leaveTypeConfig[b.key]?.order || 99));

    setBalanceCards(cards);
  };

  const handleSubmitLeave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!employee) return;

    const formData = new FormData(e.currentTarget);
    const leaveType = formData.get('leave_type') as LeaveType;
    
    // Get remaining balance for this leave type
    const balance = balanceCards.find(b => b.key === leaveType);
    const remainingBalance = balance?.remaining;

    // Validate with business rules (including advance notice, backdated rules)
    const validation = await validateLeaveRequest(startDate, endDate, leaveType, remainingBalance);

    if (!validation.isValid) {
      toast({
        title: 'ไม่สามารถยื่นคำขอลาได้',
        description: validation.message || 'กรุณาตรวจสอบช่วงวันลาอีกครั้ง',
        variant: 'destructive',
      });
      return;
    }

    // Calculate total days based on selection
    let totalDays = validation.workingDays;
    if (isSingleDay) {
      totalDays = calculatedPartialDays;
    }

    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      const warningMessage = validation.warnings.join('\n');
      if (validation.requiresSpecialApproval) {
        if (!confirm(`⚠️ คำเตือน:\n${warningMessage}\n\nต้องการดำเนินการต่อหรือไม่?`)) {
          return;
        }
      } else {
        toast({
          title: 'คำเตือน',
          description: validation.warnings[0],
          variant: 'default',
        });
      }
    }

    // For non-special approval, check balance strictly
    if (!validation.requiresSpecialApproval && balance && totalDays > balance.remaining) {
      toast({
        title: 'สิทธิ์วันลาไม่เพียงพอ',
        description: `คุณมีสิทธิ์${balance.label}คงเหลือ ${balance.remaining} วัน แต่ต้องการลา ${totalDays} วัน`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('leave_requests').insert({
        employee_id: employee.id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        reason: formData.get('reason') as string,
        start_time: isSingleDay ? startTime : null,
        end_time: isSingleDay ? endTime : null,
        is_half_day: isSingleDay && isHalfDay,
        half_day_period: isHalfDay ? halfDayPeriod : null,
      });

      if (error) throw error;

      const dayLabel = totalDays === 0.5 ? 'ครึ่งวัน' : `${totalDays} วันทำงาน`;
      const message = validation.requiresSpecialApproval
        ? `ขอลา ${dayLabel} (เกินสิทธิ์) รอการอนุมัติพิเศษ`
        : `ขอลา ${dayLabel} รอการอนุมัติจากหัวหน้างาน`;

      toast({
        title: 'ยื่นคำขอลาสำเร็จ',
        description: message,
      });
      
      // Reset form
      setIsDialogOpen(false);
      setStartDate('');
      setEndDate('');
      setIsHalfDay(false);
      setHalfDayPeriod(null);
      setStartTime('08:30');
      setEndTime('17:30');
      setSelectedLeaveType(undefined);
      setValidationError(null);
      setValidationWarnings([]);
      
      fetchLeaveRequests();
      fetchEntitlements();
    } catch (error: unknown) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleCancelLeave = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกคำขอลานี้?')) return;

    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'ยกเลิกคำขอลาสำเร็จ' });
      fetchLeaveRequests();
      fetchEntitlements();
    } catch (error: unknown) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Get available leave types based on entitlements
  const availableLeaveTypes = balanceCards.filter(b => b.quota > 0).map(b => b.key);

  if (!employee) {
    return (
      <DashboardLayout title="ขอลางาน">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            กรุณาติดต่อ HR เพื่อเชื่อมโยงบัญชีกับข้อมูลพนักงาน
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="ขอลางาน"
      subtitle="ดูสิทธิ์การลา (Pro-rate ตามวันทำงาน) และยื่นคำขอลา"
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              ยื่นคำขอลา
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ยื่นคำขอลา</DialogTitle>
              <DialogDescription>กรอกรายละเอียดการลา</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitLeave} className="space-y-4">
              <div>
                <Label htmlFor="leave_type">ประเภทการลา *</Label>
                <Select 
                  name="leave_type" 
                  required
                  onValueChange={(value) => setSelectedLeaveType(value as LeaveType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภทการลา" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLeaveTypes.includes('vacation') && (
                      <SelectItem value="vacation">ลาพักร้อน</SelectItem>
                    )}
                    {availableLeaveTypes.includes('sick') && (
                      <SelectItem value="sick">ลาป่วย</SelectItem>
                    )}
                    {availableLeaveTypes.includes('personal') && (
                      <SelectItem value="personal">ลากิจ</SelectItem>
                    )}
                    {availableLeaveTypes.includes('maternity') && (
                      <SelectItem value="maternity">ลาคลอด</SelectItem>
                    )}
                    {availableLeaveTypes.includes('paternity') && (
                      <SelectItem value="paternity">ลาช่วยภรรยาคลอด</SelectItem>
                    )}
                    <SelectItem value="unpaid">ลาไม่รับค่าจ้าง</SelectItem>
                    {availableLeaveTypes.includes('other') && (
                      <SelectItem value="other">ลาอื่นๆ</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Show leave rules for selected type */}
              <LeaveRulesInfo selectedLeaveType={selectedLeaveType} compact />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">วันที่เริ่ม *</Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">วันที่สิ้นสุด *</Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Time selector for single day leave */}
              <LeaveTimeSelector
                isHalfDay={isHalfDay}
                onHalfDayChange={setIsHalfDay}
                halfDayPeriod={halfDayPeriod}
                onHalfDayPeriodChange={setHalfDayPeriod}
                startTime={startTime}
                onStartTimeChange={setStartTime}
                endTime={endTime}
                onEndTimeChange={setEndTime}
                isSingleDay={!!isSingleDay}
                onCalculatedDays={setCalculatedPartialDays}
              />

              {/* Display calculated working days */}
              {!isSingleDay && startDate && endDate && calculatedWorkingDays > 0 && !validationError && (
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <span className="text-sm text-muted-foreground">จำนวนวันทำงานที่ลา:</span>
                  <span className="font-semibold text-primary">{calculatedWorkingDays} วัน</span>
                </div>
              )}

              {/* Validation Error Display */}
              {validationError && (
                <div className="flex items-start gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Validation Warnings Display */}
              {!validationError && validationWarnings.length > 0 && (
                <div className="flex items-start gap-2 p-3 text-sm text-warning bg-warning/10 rounded-lg border border-warning/20">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    {validationWarnings.map((warning, idx) => (
                      <p key={idx}>{warning}</p>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="reason">เหตุผล</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  placeholder="ระบุเหตุผลการลา..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setSelectedLeaveType(undefined);
                  setStartDate('');
                  setEndDate('');
                  setValidationError(null);
                  setValidationWarnings([]);
                }}>
                  ยกเลิก
                </Button>
                <Button 
                  type="submit" 
                  disabled={!!validationError || isValidating || !startDate || !endDate || !selectedLeaveType}
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังตรวจสอบ...
                    </>
                  ) : (
                    'ยื่นคำขอ'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Mobile: Tabs for Holiday and Team Calendar */}
        <div className="lg:hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="balance">วันลาคงเหลือ</TabsTrigger>
              <TabsTrigger value="team">ปฏิทินทีม</TabsTrigger>
            </TabsList>
            <TabsContent value="balance" className="mt-4">
              <HolidayCalendar />
            </TabsContent>
            <TabsContent value="team" className="mt-4">
              <TeamLeaveCalendar showDepartmentFilter={false} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          {/* Leave Balance Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {balanceCards.map((card, index) => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground">{card.label}</span>
                      <div className="flex items-center gap-1 sm:gap-2">
                        {card.isProrated && (
                          <span className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                            Pro-rate
                          </span>
                        )}
                        <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${card.color}`} />
                      </div>
                    </div>
                    <div className="flex items-end gap-1 sm:gap-2">
                      <span className="text-xl sm:text-3xl font-bold">
                        {card.remaining.toFixed(1)}
                      </span>
                      <span className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">
                        / {card.quota.toFixed(1)} วัน
                      </span>
                    </div>
                    <div className="mt-2 sm:mt-3 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${card.quota > 0 ? (card.used / card.quota) * 100 : 0}%` }}
                        transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                        className={`h-full ${card.color}`}
                      />
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">
                      ใช้ไปแล้ว {card.used.toFixed(1)} วัน
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Leave History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                ประวัติการลา
              </CardTitle>
              <CardDescription>รายการขอลาทั้งหมดของคุณ</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>ยังไม่มีประวัติการลา</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaveRequests.map((leave, index) => (
                    <motion.div
                      key={leave.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <CalendarDays className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{leaveTypeLabels[leave.leave_type]}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(leave.start_date), 'd MMM', { locale: th })} - {format(new Date(leave.end_date), 'd MMM yyyy', { locale: th })}
                            <span className="mx-2">•</span>
                            {leave.total_days} วันทำงาน
                          </p>
                          {leave.reason && (
                            <p className="text-sm text-muted-foreground mt-1">
                              เหตุผล: {leave.reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={leave.status} type="leave" />
                        {leave.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleCancelLeave(leave.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Calendars (Desktop only) */}
        <div className="hidden lg:flex lg:flex-col lg:col-span-1 gap-4">
          <HolidayCalendar />
          <TeamLeaveCalendar />
        </div>
      </div>
    </DashboardLayout>
  );
}