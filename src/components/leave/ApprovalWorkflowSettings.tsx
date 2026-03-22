 import { useState, useEffect } from 'react';
 import { Plus, Edit, Trash2, ArrowRight, Users, User } from 'lucide-react';
import { Crown } from 'lucide-react';
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
 } from '@/components/ui/dialog';
 import { Label } from '@/components/ui/label';
 import { Switch } from '@/components/ui/switch';
 import { Textarea } from '@/components/ui/textarea';
 import { useToast } from '@/hooks/use-toast';
 import { supabase } from '@/integrations/supabase/client';
 import type { LeaveType } from '@/types/hr';
 import { leaveTypeLabels } from '@/types/hr';
 
 interface ApprovalWorkflow {
   id: string;
   leave_type: LeaveType;
   approval_levels: number;
   min_days: number | null;
   max_days: number | null;
   requires_hr: boolean;
   description: string | null;
   created_at: string;
   updated_at: string;
 }
 
 export function ApprovalWorkflowSettings() {
   const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
   const [loading, setLoading] = useState(true);
   const [isDialogOpen, setIsDialogOpen] = useState(false);
   const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);
   const [requiresHR, setRequiresHR] = useState(false);
   const { toast } = useToast();
 
   useEffect(() => {
     fetchWorkflows();
   }, []);
 
   const fetchWorkflows = async () => {
     try {
       const { data, error } = await supabase
         .from('approval_workflows')
         .select('*')
         .order('leave_type')
         .order('min_days');
 
       if (error) throw error;
       setWorkflows((data as ApprovalWorkflow[]) || []);
     } catch (error) {
       console.error('Error fetching workflows:', error);
     } finally {
       setLoading(false);
     }
   };
 
   const handleSaveWorkflow = async (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     const formData = new FormData(e.currentTarget);
 
     const minDays = formData.get('min_days') as string;
     const maxDays = formData.get('max_days') as string;
 
     const workflowData = {
       leave_type: formData.get('leave_type') as LeaveType,
       approval_levels: parseInt(formData.get('approval_levels') as string) || 1,
       min_days: minDays ? parseInt(minDays) : null,
       max_days: maxDays ? parseInt(maxDays) : null,
       requires_hr: requiresHR,
       description: formData.get('description') as string || null,
     };
 
     try {
       if (editingWorkflow) {
         const { error } = await supabase
           .from('approval_workflows')
           .update(workflowData)
           .eq('id', editingWorkflow.id);
 
         if (error) throw error;
         toast({ title: 'อัพเดตลำดับการอนุมัติสำเร็จ' });
       } else {
         const { error } = await supabase
           .from('approval_workflows')
           .insert(workflowData);
 
         if (error) throw error;
         toast({ title: 'เพิ่มลำดับการอนุมัติสำเร็จ' });
       }
 
       setIsDialogOpen(false);
       setEditingWorkflow(null);
       setRequiresHR(false);
       fetchWorkflows();
     } catch (error: unknown) {
       toast({
         title: 'เกิดข้อผิดพลาด',
         description: error instanceof Error ? error.message : 'Unknown error',
         variant: 'destructive',
       });
     }
   };
 
   const handleDeleteWorkflow = async (workflow: ApprovalWorkflow) => {
     if (!confirm('คุณแน่ใจหรือไม่ที่จะลบลำดับการอนุมัตินี้?')) return;
 
     try {
       const { error } = await supabase
         .from('approval_workflows')
         .delete()
         .eq('id', workflow.id);
 
       if (error) throw error;
       toast({ title: 'ลบลำดับการอนุมัติสำเร็จ' });
       fetchWorkflows();
     } catch (error: unknown) {
       toast({
         title: 'เกิดข้อผิดพลาด',
         description: error instanceof Error ? error.message : 'Unknown error',
         variant: 'destructive',
       });
     }
   };
 
   const openEditDialog = (workflow: ApprovalWorkflow) => {
     setEditingWorkflow(workflow);
     setRequiresHR(workflow.requires_hr || false);
     setIsDialogOpen(true);
   };
 
   const openCreateDialog = () => {
     setEditingWorkflow(null);
     setRequiresHR(false);
     setIsDialogOpen(true);
   };
 
   const formatDaysRange = (min: number | null, max: number | null) => {
     if (min === null && max === null) return 'ทุกจำนวนวัน';
     if (min === null) return `≤ ${max} วัน`;
     if (max === null) return `> ${min} วัน`;
     return `${min} - ${max} วัน`;
   };
 
   const renderApprovalFlow = (workflow: ApprovalWorkflow) => {
     const steps = [];
     
     // Level 1: Manager
     if (workflow.approval_levels >= 1) {
       steps.push(
         <div key="manager" className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
           <User className="w-4 h-4 text-primary" />
           <span className="text-sm font-medium">หัวหน้างาน</span>
         </div>
       );
     }
     
    // HR (if requires_hr is true)
    if (workflow.requires_hr) {
       if (steps.length > 0) {
         steps.push(
           <ArrowRight key="arrow1" className="w-4 h-4 text-muted-foreground" />
         );
       }
       steps.push(
         <div key="hr" className="flex items-center gap-2 px-3 py-2 bg-warning/10 rounded-lg">
           <Users className="w-4 h-4 text-warning" />
           <span className="text-sm font-medium">HR</span>
         </div>
       );
     }
    
    // Level 2: CEO
    if (workflow.approval_levels >= 2) {
      steps.push(
        <ArrowRight key="arrow2" className="w-4 h-4 text-muted-foreground" />
      );
      steps.push(
        <div key="ceo" className="flex items-center gap-2 px-3 py-2 bg-success/10 rounded-lg">
          <Crown className="w-4 h-4 text-success" />
          <span className="text-sm font-medium">CEO</span>
        </div>
      );
    }
     
     return (
       <div className="flex items-center gap-2">
         {steps.length > 0 ? steps : (
           <span className="text-muted-foreground text-sm">ไม่ต้องอนุมัติ</span>
         )}
       </div>
     );
   };
 
   // Group by leave type
   const groupedWorkflows = workflows.reduce((acc, workflow) => {
     if (!acc[workflow.leave_type]) {
       acc[workflow.leave_type] = [];
     }
     acc[workflow.leave_type].push(workflow);
     return acc;
   }, {} as Record<LeaveType, ApprovalWorkflow[]>);
 
   return (
     <div className="space-y-6">
       <div className="flex justify-between items-center">
         <div>
           <h3 className="text-lg font-semibold">ตั้งค่าลำดับการอนุมัติ</h3>
           <p className="text-sm text-muted-foreground">
             กำหนดลำดับการอนุมัติตามประเภทการลาและจำนวนวัน
           </p>
         </div>
         <Button onClick={openCreateDialog}>
           <Plus className="w-4 h-4 mr-2" />
           เพิ่มลำดับการอนุมัติ
         </Button>
       </div>
 
       {loading ? (
         <div className="space-y-4">
           {[...Array(3)].map((_, i) => (
             <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
           ))}
         </div>
       ) : workflows.length === 0 ? (
         <Card>
           <CardContent className="py-12 text-center text-muted-foreground">
             <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
             <p>ยังไม่มีการตั้งค่าลำดับการอนุมัติ</p>
             <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
               <Plus className="w-4 h-4 mr-2" />
               เพิ่มลำดับการอนุมัติแรก
             </Button>
           </CardContent>
         </Card>
       ) : (
         <div className="space-y-4">
           {Object.entries(groupedWorkflows).map(([leaveType, typeWorkflows]) => (
             <Card key={leaveType}>
               <CardHeader className="pb-3">
                 <CardTitle className="text-base flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-primary" />
                   {leaveTypeLabels[leaveType as LeaveType]}
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>จำนวนวัน</TableHead>
                       <TableHead>ลำดับการอนุมัติ</TableHead>
                       <TableHead>คำอธิบาย</TableHead>
                       <TableHead className="w-[100px]"></TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {typeWorkflows.map((workflow) => (
                       <TableRow key={workflow.id}>
                         <TableCell className="font-medium">
                           {formatDaysRange(workflow.min_days, workflow.max_days)}
                         </TableCell>
                         <TableCell>
                           {renderApprovalFlow(workflow)}
                         </TableCell>
                         <TableCell className="text-muted-foreground text-sm">
                           {workflow.description || '-'}
                         </TableCell>
                         <TableCell>
                           <div className="flex gap-1">
                             <Button
                               variant="ghost"
                               size="icon"
                               onClick={() => openEditDialog(workflow)}
                             >
                               <Edit className="w-4 h-4" />
                             </Button>
                             <Button
                               variant="ghost"
                               size="icon"
                               onClick={() => handleDeleteWorkflow(workflow)}
                             >
                               <Trash2 className="w-4 h-4 text-destructive" />
                             </Button>
                           </div>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </CardContent>
             </Card>
           ))}
         </div>
       )}
 
       {/* Info Card */}
       <Card className="bg-muted/30">
         <CardHeader>
           <CardTitle className="text-sm font-medium flex items-center gap-2">
             📋 วิธีการทำงานของลำดับการอนุมัติ
           </CardTitle>
         </CardHeader>
         <CardContent className="text-sm text-muted-foreground space-y-2">
           <p>• <strong>ระดับที่ 1 - หัวหน้างาน:</strong> หัวหน้าที่กำหนดในข้อมูลพนักงาน</p>
          <p>• <strong>ระดับที่ 2 - CEO:</strong> ผู้ใช้ที่มี Role เป็น Admin</p>
          <p>• <strong>HR (ถ้าเปิดใช้):</strong> ต้องผ่าน HR ก่อนถึง CEO</p>
           <p>• ระบบจะเลือกใช้กฎที่ตรงกับประเภทการลาและจำนวนวัน</p>
           <p>• หากไม่พบกฎที่ตรง จะใช้ค่าเริ่มต้น (หัวหน้างานอนุมัติ)</p>
         </CardContent>
       </Card>
 
       {/* Dialog */}
       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <DialogContent className="max-w-lg">
           <DialogHeader>
             <DialogTitle>
               {editingWorkflow ? 'แก้ไขลำดับการอนุมัติ' : 'เพิ่มลำดับการอนุมัติใหม่'}
             </DialogTitle>
             <DialogDescription>
               กำหนดลำดับการอนุมัติตามประเภทการลาและจำนวนวัน
             </DialogDescription>
           </DialogHeader>
           <form onSubmit={handleSaveWorkflow} className="space-y-4">
             <div>
               <Label htmlFor="leave_type">ประเภทการลา</Label>
               <Select name="leave_type" defaultValue={editingWorkflow?.leave_type || 'vacation'}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="vacation">ลาพักร้อน</SelectItem>
                   <SelectItem value="sick">ลาป่วย</SelectItem>
                   <SelectItem value="personal">ลากิจ</SelectItem>
                   <SelectItem value="maternity">ลาคลอด</SelectItem>
                   <SelectItem value="paternity">ลาช่วยภรรยาคลอด</SelectItem>
                   <SelectItem value="other">ลาอื่นๆ</SelectItem>
                 </SelectContent>
               </Select>
             </div>
 
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <Label htmlFor="min_days">จำนวนวันขั้นต่ำ</Label>
                 <Input
                   id="min_days"
                   name="min_days"
                   type="number"
                   min="0"
                   defaultValue={editingWorkflow?.min_days ?? ''}
                   placeholder="ว่างไว้ = ไม่จำกัด"
                 />
               </div>
               <div>
                 <Label htmlFor="max_days">จำนวนวันสูงสุด</Label>
                 <Input
                   id="max_days"
                   name="max_days"
                   type="number"
                   min="0"
                   defaultValue={editingWorkflow?.max_days ?? ''}
                   placeholder="ว่างไว้ = ไม่จำกัด"
                 />
               </div>
             </div>
 
             <div>
               <Label htmlFor="approval_levels">จำนวนระดับการอนุมัติ</Label>
               <Select name="approval_levels" defaultValue={String(editingWorkflow?.approval_levels || 1)}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="1">1 ระดับ (หัวหน้างาน)</SelectItem>
                  <SelectItem value="2">2 ระดับ (หัวหน้างาน → CEO)</SelectItem>
                 </SelectContent>
               </Select>
             </div>
 
             <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
               <Switch
                 id="requires_hr"
                 checked={requiresHR}
                 onCheckedChange={setRequiresHR}
               />
               <div>
                 <Label htmlFor="requires_hr" className="cursor-pointer">
                  ต้องผ่าน HR ก่อน
                 </Label>
                 <p className="text-xs text-muted-foreground">
                  หัวหน้างาน → HR → CEO (ถ้าเลือก 2 ระดับ)
                 </p>
               </div>
             </div>
 
             <div>
               <Label htmlFor="description">คำอธิบาย</Label>
               <Textarea
                 id="description"
                 name="description"
                 defaultValue={editingWorkflow?.description || ''}
                 placeholder="เช่น ลาพักร้อนมากกว่า 3 วันต้องให้ HR อนุมัติ"
                 rows={2}
               />
             </div>
 
             <div className="flex justify-end gap-3 pt-2">
               <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                 ยกเลิก
               </Button>
               <Button type="submit">
                 {editingWorkflow ? 'บันทึก' : 'เพิ่มลำดับการอนุมัติ'}
               </Button>
             </div>
           </form>
         </DialogContent>
       </Dialog>
     </div>
   );
 }