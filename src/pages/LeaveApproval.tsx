import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Check, X, Clock, User } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { LeaveRequest, Employee, LeaveStatus } from '@/types/hr';
import { leaveTypeLabels } from '@/types/hr';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface LeaveWithEmployee extends LeaveRequest {
  employee: Employee;
}

export default function LeaveApproval() {
  const { employee, user, isHROrAdmin } = useAuth();
  const { toast } = useToast();
  const [leaveRequests, setLeaveRequests] = useState<LeaveWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState<LeaveWithEmployee | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (employee || isHROrAdmin) {
      fetchLeaveRequests();
    }
  }, [employee?.id, isHROrAdmin]);

  const fetchLeaveRequests = async () => {
    try {
      // The RLS policy will automatically filter based on the user's role
      // - Managers see only their team's requests
      // - HR/Admin see all requests
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employee:employees!leave_requests_employee_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeaveRequests(data as LeaveWithEmployee[] || []);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดคำขอลาได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async (
    userId: string,
    title: string,
    message: string,
    type: 'success' | 'error' | 'info',
    link?: string
  ) => {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message,
        type,
        link,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleApprove = async (leave: LeaveWithEmployee) => {
    // Allow HR/Admin to approve even without employee record
    if (!user) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'กรุณาเข้าสู่ระบบใหม่',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved' as LeaveStatus,
          approver_id: employee?.id || null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', leave.id);

      if (error) throw error;

      // Send notification to the employee
      if (leave.employee.user_id) {
        const startDate = format(new Date(leave.start_date), 'd MMM', { locale: th });
        const endDate = format(new Date(leave.end_date), 'd MMM yyyy', { locale: th });
        await sendNotification(
          leave.employee.user_id,
          'คำขอลาได้รับอนุมัติแล้ว ✅',
          `${leaveTypeLabels[leave.leave_type]} (${startDate} - ${endDate}) ได้รับอนุมัติแล้ว`,
          'success',
          '/leave/request'
        );
      }

      toast({
        title: 'อนุมัติสำเร็จ',
        description: `อนุมัติการลาของ ${leave.employee.first_name} แล้ว`,
      });
      fetchLeaveRequests();
    } catch (error: any) {
      console.error('Approve error:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!selectedLeave || !user) return;

    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected' as LeaveStatus,
          approver_id: employee?.id || null,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', selectedLeave.id);

      if (error) throw error;

      // Send notification to the employee
      if (selectedLeave.employee.user_id) {
        const startDate = format(new Date(selectedLeave.start_date), 'd MMM', { locale: th });
        const endDate = format(new Date(selectedLeave.end_date), 'd MMM yyyy', { locale: th });
        await sendNotification(
          selectedLeave.employee.user_id,
          'คำขอลาไม่ได้รับอนุมัติ ❌',
          `${leaveTypeLabels[selectedLeave.leave_type]} (${startDate} - ${endDate}) ไม่ได้รับอนุมัติ${rejectionReason ? `: ${rejectionReason}` : ''}`,
          'error',
          '/leave/request'
        );
      }

      toast({
        title: 'ปฏิเสธคำขอลาแล้ว',
      });
      setIsRejectDialogOpen(false);
      setSelectedLeave(null);
      setRejectionReason('');
      fetchLeaveRequests();
    } catch (error: any) {
      console.error('Reject error:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredRequests = leaveRequests.filter((req) => {
    if (activeTab === 'pending') return req.status === 'pending';
    if (activeTab === 'approved') return req.status === 'approved';
    if (activeTab === 'rejected') return req.status === 'rejected';
    return true;
  });

  const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;
  const approvedCount = leaveRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = leaveRequests.filter(r => r.status === 'rejected').length;

  return (
    <DashboardLayout
      title="อนุมัติการลา"
      subtitle={`มี ${pendingCount} คำขอรออนุมัติ`}
    >
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                รออนุมัติ
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-warning/20 text-warning">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <Check className="w-4 h-4" />
                อนุมัติแล้ว ({approvedCount})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2">
                <X className="w-4 h-4" />
                ไม่อนุมัติ ({rejectedCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardCheck className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">ไม่มีคำขอลา{activeTab === 'pending' ? 'รออนุมัติ' : ''}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((leave, index) => (
                <motion.div
                  key={leave.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-5 rounded-xl border bg-card hover:shadow-card transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">
                        {leave.employee.prefix} {leave.employee.first_name} {leave.employee.last_name}
                      </p>
                      <p className="text-muted-foreground">
                        {leave.employee.department?.name || 'ไม่ระบุแผนก'} • {leave.employee.position?.name || 'ไม่ระบุตำแหน่ง'}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-medium text-primary">
                          {leaveTypeLabels[leave.leave_type]}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(leave.start_date), 'd MMM', { locale: th })} - {format(new Date(leave.end_date), 'd MMM yyyy', { locale: th })}
                        </span>
                        <span className="px-2 py-0.5 bg-muted rounded text-sm">
                          {leave.total_days} วัน
                        </span>
                      </div>
                      {leave.reason && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">เหตุผล:</span> {leave.reason}
                        </p>
                      )}
                      {leave.rejection_reason && (
                        <p className="text-sm text-destructive mt-2">
                          <span className="font-medium">เหตุผลที่ไม่อนุมัติ:</span> {leave.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <StatusBadge status={leave.status} type="leave" />
                    
                    {leave.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => {
                            setSelectedLeave(leave);
                            setIsRejectDialogOpen(true);
                          }}
                        >
                          <X className="w-4 h-4 mr-1" />
                          ไม่อนุมัติ
                        </Button>
                        <Button
                          size="sm"
                          className="bg-success hover:bg-success/90"
                          onClick={() => handleApprove(leave)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          อนุมัติ
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ไม่อนุมัติคำขอลา</DialogTitle>
            <DialogDescription>
              {selectedLeave && (
                <>
                  คำขอลาของ {selectedLeave.employee.first_name} {selectedLeave.employee.last_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection_reason">เหตุผล (ไม่บังคับ)</Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="ระบุเหตุผลที่ไม่อนุมัติ..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                ยืนยันไม่อนุมัติ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
