import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Plus, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Department } from '@/types/hr';

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const departmentData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
    };

    try {
      if (editingDepartment) {
        const { error } = await supabase
          .from('departments')
          .update(departmentData)
          .eq('id', editingDepartment.id);

        if (error) throw error;
        toast({ title: 'อัพเดตแผนกสำเร็จ' });
      } else {
        const { error } = await supabase
          .from('departments')
          .insert(departmentData);

        if (error) throw error;
        toast({ title: 'เพิ่มแผนกสำเร็จ' });
      }

      setIsDialogOpen(false);
      setEditingDepartment(null);
      fetchDepartments();
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', deletingId);

      if (error) throw error;
      toast({ title: 'ลบแผนกสำเร็จ' });
      fetchDepartments();
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout
      title="จัดการแผนก"
      subtitle={`ทั้งหมด ${departments.length} แผนก`}
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingDepartment(null)}>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มแผนก
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDepartment ? 'แก้ไขแผนก' : 'เพิ่มแผนกใหม่'}
              </DialogTitle>
              <DialogDescription>กรอกข้อมูลแผนก</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label htmlFor="name">ชื่อแผนก *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingDepartment?.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">รายละเอียด</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingDepartment?.description || ''}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit">บันทึก</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))
        ) : departments.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>ยังไม่มีแผนก</p>
          </div>
        ) : (
          departments.map((dept, index) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="card-interactive">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{dept.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {dept.description || 'ไม่มีรายละเอียด'}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingDepartment(dept);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          แก้ไข
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setDeletingId(dept.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          ลบ
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="ลบแผนก"
        description="คุณแน่ใจหรือไม่ที่จะลบแผนกนี้? พนักงานที่อยู่ในแผนกนี้จะไม่มีแผนกสังกัด"
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </DashboardLayout>
  );
}
