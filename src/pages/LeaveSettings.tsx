import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, History, Calculator, GitBranch } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { EmployeeStatus, EmployeeType, LeavePolicyRule, PolicyAuditLog } from '@/types/hr';
import { employeeStatusLabels, employeeTypeLabels } from '@/types/hr';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { ApprovalWorkflowSettings } from '@/components/leave/ApprovalWorkflowSettings';

export default function LeaveSettings() {
  const { user } = useAuth();
  const [rules, setRules] = useState<LeavePolicyRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<PolicyAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<LeavePolicyRule | null>(null);
  const [isProrated, setIsProrated] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRules();
    fetchAuditLogs();
  }, []);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('leave_policy_rules')
        .select('*')
        .order('employee_type')
        .order('employee_status')
        .order('min_years_of_service');

      if (error) throw error;
      setRules((data as LeavePolicyRule[]) || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('policy_audit_logs')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuditLogs((data as PolicyAuditLog[]) || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const handleSaveRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const maxYears = formData.get('max_years_of_service') as string;
    
    const ruleData = {
      employee_type: formData.get('employee_type') as EmployeeType,
      employee_status: formData.get('employee_status') as EmployeeStatus,
      min_years_of_service: parseInt(formData.get('min_years_of_service') as string) || 0,
      max_years_of_service: maxYears ? parseInt(maxYears) : null,
      annual_leave_quota: parseInt(formData.get('annual_leave_quota') as string) || 0,
      sick_leave_quota: parseInt(formData.get('sick_leave_quota') as string) || 0,
      personal_leave_quota: parseInt(formData.get('personal_leave_quota') as string) || 0,
      other_leave_quota: parseInt(formData.get('other_leave_quota') as string) || 0,
      maternity_leave_quota: parseInt(formData.get('maternity_leave_quota') as string) || 0,
      paternity_leave_quota: parseInt(formData.get('paternity_leave_quota') as string) || 0,
      is_prorated: isProrated,
      description: formData.get('description') as string || null,
    };

    try {
      if (editingRule) {
        // Log audit before update
        await supabase.from('policy_audit_logs').insert({
          policy_id: editingRule.id,
          action: 'update',
          old_values: editingRule as unknown as Record<string, unknown>,
          new_values: ruleData as unknown as Record<string, unknown>,
          changed_by: user?.id || '',
        } as never);

        const { error } = await supabase
          .from('leave_policy_rules')
          .update(ruleData)
          .eq('id', editingRule.id);

        if (error) throw error;
        toast({ title: 'อัพเดตกฎการลาสำเร็จ' });
      } else {
        const { data, error } = await supabase
          .from('leave_policy_rules')
          .insert(ruleData)
          .select()
          .single();

        if (error) throw error;
        
        // Log audit after create
        await supabase.from('policy_audit_logs').insert({
          policy_id: data.id,
          action: 'create',
          old_values: null,
          new_values: ruleData as unknown as Record<string, unknown>,
          changed_by: user?.id || '',
        } as never);

        toast({ title: 'เพิ่มกฎการลาสำเร็จ' });
      }

      setIsDialogOpen(false);
      setEditingRule(null);
      setIsProrated(true);
      fetchRules();
      fetchAuditLogs();
    } catch (error: unknown) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRule = async (rule: LeavePolicyRule) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบกฎการลานี้?')) return;

    try {
      // Log audit before delete
      await supabase.from('policy_audit_logs').insert({
        policy_id: rule.id,
        action: 'delete',
        old_values: rule as unknown as Record<string, unknown>,
        new_values: null,
        changed_by: user?.id || '',
      } as never);

      const { error } = await supabase
        .from('leave_policy_rules')
        .delete()
        .eq('id', rule.id);

      if (error) throw error;
      toast({ title: 'ลบกฎการลาสำเร็จ' });
      fetchRules();
      fetchAuditLogs();
    } catch (error: unknown) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleRecalculateAll = async () => {
    if (!confirm('คุณต้องการคำนวณสิทธิ์วันลาใหม่ให้พนักงานทั้งหมดหรือไม่?')) return;
    
    toast({ title: 'กำลังคำนวณ...', description: 'กรุณารอสักครู่' });
    
    try {
      // Get all active employees
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('status', 'active');

      if (empError) throw empError;

      // Recalculate for each employee
      const currentYear = new Date().getFullYear();
      for (const emp of employees || []) {
        await supabase.rpc('recalculate_employee_entitlements', {
          p_employee_id: emp.id,
          p_year: currentYear,
        });
      }

      toast({ title: 'คำนวณสิทธิ์วันลาใหม่เรียบร้อย', description: `อัพเดต ${employees?.length || 0} คน` });
    } catch (error: unknown) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const formatYearsRange = (min: number, max: number | null) => {
    if (max === null) {
      return `${min} ปีขึ้นไป`;
    }
    if (min === 0 && max === 0) {
      return 'น้อยกว่า 1 ปี';
    }
    return `${min} - ${max} ปี`;
  };

  const openEditDialog = (rule: LeavePolicyRule) => {
    setEditingRule(rule);
    setIsProrated(rule.is_prorated);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingRule(null);
    setIsProrated(true);
    setIsDialogOpen(true);
  };

  // Group rules by employee type
  const permanentRules = rules.filter(r => r.employee_type === 'permanent');
  const contractRules = rules.filter(r => r.employee_type === 'contract');
  const parttimeRules = rules.filter(r => r.employee_type === 'parttime');

  const RulesTable = ({ rulesList, showType = false }: { rulesList: LeavePolicyRule[], showType?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          {showType && <TableHead>ประเภท</TableHead>}
          <TableHead>สถานะ</TableHead>
          <TableHead>อายุงาน</TableHead>
          <TableHead className="text-center">พักร้อน</TableHead>
          <TableHead className="text-center">ป่วย</TableHead>
          <TableHead className="text-center">กิจ</TableHead>
          <TableHead className="text-center">คลอด</TableHead>
          <TableHead className="text-center">ช่วยภรรยา</TableHead>
          <TableHead className="text-center">Pro-rate</TableHead>
          <TableHead className="w-[100px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rulesList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showType ? 10 : 9} className="text-center py-8 text-muted-foreground">
              ยังไม่มีกฎการลา
            </TableCell>
          </TableRow>
        ) : (
          rulesList.map((rule) => (
            <TableRow key={rule.id}>
              {showType && (
                <TableCell className="font-medium">
                  {employeeTypeLabels[rule.employee_type]}
                </TableCell>
              )}
              <TableCell>{employeeStatusLabels[rule.employee_status]}</TableCell>
              <TableCell>{formatYearsRange(rule.min_years_of_service, rule.max_years_of_service)}</TableCell>
              <TableCell className="text-center">{rule.annual_leave_quota}</TableCell>
              <TableCell className="text-center">{rule.sick_leave_quota}</TableCell>
              <TableCell className="text-center">{rule.personal_leave_quota}</TableCell>
              <TableCell className="text-center">{rule.maternity_leave_quota}</TableCell>
              <TableCell className="text-center">{rule.paternity_leave_quota}</TableCell>
              <TableCell className="text-center">
                <span className={`text-xs px-2 py-1 rounded-full ${rule.is_prorated ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {rule.is_prorated ? 'ใช่' : 'ไม่'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(rule)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteRule(rule)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <DashboardLayout
      title="ตั้งค่าสิทธิ์การลา"
      subtitle="กำหนดสิทธิ์การลาตามประเภทพนักงาน อายุงาน และสถานะ (รองรับ Pro-rate)"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRecalculateAll}>
            <Calculator className="w-4 h-4 mr-2" />
            คำนวณใหม่ทั้งหมด
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มกฎการลา
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? 'แก้ไขกฎการลา' : 'เพิ่มกฎการลาใหม่'}
                </DialogTitle>
                <DialogDescription>
                  กำหนดสิทธิ์การลาตามประเภทพนักงาน อายุงาน และสถานะ
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveRule} className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="employee_type">ประเภทพนักงาน</Label>
                    <Select name="employee_type" defaultValue={editingRule?.employee_type || 'permanent'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="permanent">ประจำ</SelectItem>
                        <SelectItem value="contract">สัญญาจ้าง/ทดลองงาน</SelectItem>
                        <SelectItem value="parttime">พาร์ทไทม์</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="employee_status">สถานะพนักงาน</Label>
                    <Select name="employee_status" defaultValue={editingRule?.employee_status || 'active'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">ทำงาน</SelectItem>
                        <SelectItem value="resigned">ลาออก</SelectItem>
                        <SelectItem value="suspended">พักงาน</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">คำอธิบาย</Label>
                    <Input
                      id="description"
                      name="description"
                      defaultValue={editingRule?.description || ''}
                      placeholder="เช่น พนักงานใหม่"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="min_years_of_service">อายุงานขั้นต่ำ (ปี)</Label>
                    <Input
                      id="min_years_of_service"
                      name="min_years_of_service"
                      type="number"
                      min="0"
                      defaultValue={editingRule?.min_years_of_service || 0}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_years_of_service">อายุงานสูงสุด (ปี)</Label>
                    <Input
                      id="max_years_of_service"
                      name="max_years_of_service"
                      type="number"
                      min="0"
                      defaultValue={editingRule?.max_years_of_service ?? ''}
                      placeholder="ว่างไว้ = ไม่จำกัด"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="is_prorated"
                        checked={isProrated}
                        onCheckedChange={setIsProrated}
                      />
                      <Label htmlFor="is_prorated" className="cursor-pointer">
                        ใช้ Pro-rate
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    สิทธิ์วันลา (วันต่อปี)
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="annual_leave_quota">ลาพักร้อน</Label>
                      <Input
                        id="annual_leave_quota"
                        name="annual_leave_quota"
                        type="number"
                        min="0"
                        defaultValue={editingRule?.annual_leave_quota || 0}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sick_leave_quota">ลาป่วย</Label>
                      <Input
                        id="sick_leave_quota"
                        name="sick_leave_quota"
                        type="number"
                        min="0"
                        defaultValue={editingRule?.sick_leave_quota || 0}
                      />
                    </div>
                    <div>
                      <Label htmlFor="personal_leave_quota">ลากิจ</Label>
                      <Input
                        id="personal_leave_quota"
                        name="personal_leave_quota"
                        type="number"
                        min="0"
                        defaultValue={editingRule?.personal_leave_quota || 0}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="other_leave_quota">ลาอื่นๆ</Label>
                      <Input
                        id="other_leave_quota"
                        name="other_leave_quota"
                        type="number"
                        min="0"
                        defaultValue={editingRule?.other_leave_quota || 0}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maternity_leave_quota">ลาคลอด (ไม่ Pro-rate)</Label>
                      <Input
                        id="maternity_leave_quota"
                        name="maternity_leave_quota"
                        type="number"
                        min="0"
                        defaultValue={editingRule?.maternity_leave_quota || 0}
                      />
                    </div>
                    <div>
                      <Label htmlFor="paternity_leave_quota">ลาช่วยภรรยาคลอด (ไม่ Pro-rate)</Label>
                      <Input
                        id="paternity_leave_quota"
                        name="paternity_leave_quota"
                        type="number"
                        min="0"
                        defaultValue={editingRule?.paternity_leave_quota || 0}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                  <p className="font-medium mb-2">📋 สูตรคำนวณ Pro-rate:</p>
                  <p className="font-mono text-xs">สิทธิ์วันลา = (วันลา/ปี ÷ 365) × จำนวนวันทำงานจริงในปี</p>
                  <p className="mt-2">* ปัดเศษลงขั้นต่ำ 0.5 วัน</p>
                  <p>* ลาคลอด/ลาช่วยภรรยาคลอด ไม่ใช้ Pro-rate</p>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit">
                    {editingRule ? 'บันทึก' : 'เพิ่มกฎการลา'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <Tabs defaultValue="policies" className="space-y-6">
        <TabsList>
          <TabsTrigger value="policies">นโยบายการลา</TabsTrigger>
          <TabsTrigger value="approval">
            <GitBranch className="w-4 h-4 mr-2" />
            ลำดับการอนุมัติ
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="w-4 h-4 mr-2" />
            ประวัติการแก้ไข
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-6">
          {/* Permanent Employees */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔹 พนักงานประจำ</CardTitle>
                <CardDescription>สิทธิ์การลาสำหรับพนักงานประจำ (ผ่านทดลองงาน)</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-20 bg-muted animate-pulse rounded-lg" />
                ) : (
                  <RulesTable rulesList={permanentRules} />
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Contract/Probation Employees */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔸 พนักงานสัญญาจ้าง/ทดลองงาน</CardTitle>
                <CardDescription>สิทธิ์การลาสำหรับพนักงานทดลองงานหรือสัญญาจ้าง</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-20 bg-muted animate-pulse rounded-lg" />
                ) : (
                  <RulesTable rulesList={contractRules} />
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Part-time Employees */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔻 พนักงานพาร์ทไทม์</CardTitle>
                <CardDescription>สิทธิ์การลาสำหรับพนักงานพาร์ทไทม์</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-20 bg-muted animate-pulse rounded-lg" />
                ) : (
                  <RulesTable rulesList={parttimeRules} />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="approval">
          <ApprovalWorkflowSettings />
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ประวัติการแก้ไขนโยบาย (Audit Trail)</CardTitle>
              <CardDescription>บันทึกการเปลี่ยนแปลงนโยบายทั้งหมด</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead>การกระทำ</TableHead>
                    <TableHead>รายละเอียด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        ยังไม่มีประวัติการแก้ไข
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.changed_at), 'd MMM yyyy HH:mm', { locale: th })}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            log.action === 'create' ? 'bg-success/20 text-success' :
                            log.action === 'update' ? 'bg-warning/20 text-warning' :
                            'bg-destructive/20 text-destructive'
                          }`}>
                            {log.action === 'create' ? 'สร้าง' : log.action === 'update' ? 'แก้ไข' : 'ลบ'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.new_values && (
                            <span>
                              {(log.new_values as { description?: string }).description || 
                               `${employeeTypeLabels[(log.new_values as { employee_type: EmployeeType }).employee_type]} - ${employeeStatusLabels[(log.new_values as { employee_status: EmployeeStatus }).employee_status]}`}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}