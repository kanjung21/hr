import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Plus, Edit, Trash2, MoreHorizontal } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Position, Department } from '@/types/hr';

export default function Positions() {
  const [positions, setPositions] = useState<(Position & { department?: Department })[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [positionsRes, departmentsRes] = await Promise.all([
        supabase.from('positions').select('*, department:departments(*)').order('name'),
        supabase.from('departments').select('*').order('name'),
      ]);

      setPositions(positionsRes.data || []);
      setDepartments(departmentsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const positionData = {
      name: formData.get('name') as string,
      department_id: formData.get('department_id') as string || null,
      description: formData.get('description') as string || null,
    };

    try {
      if (editingPosition) {
        const { error } = await supabase
          .from('positions')
          .update(positionData)
          .eq('id', editingPosition.id);

        if (error) throw error;
        toast({ title: 'อัพเดตตำแหน่งสำเร็จ' });
      } else {
        const { error } = await supabase
          .from('positions')
          .insert(positionData);

        if (error) throw error;
        toast({ title: 'เพิ่มตำแหน่งสำเร็จ' });
      }

      setIsDialogOpen(false);
      setEditingPosition(null);
      fetchData();
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
        .from('positions')
        .delete()
        .eq('id', deletingId);

      if (error) throw error;
      toast({ title: 'ลบตำแหน่งสำเร็จ' });
      fetchData();
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
      title="จัดการตำแหน่ง"
      subtitle={`ทั้งหมด ${positions.length} ตำแหน่ง`}
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPosition(null)}>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มตำแหน่ง
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPosition ? 'แก้ไขตำแหน่ง' : 'เพิ่มตำแหน่งใหม่'}
              </DialogTitle>
              <DialogDescription>กรอกข้อมูลตำแหน่ง</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label htmlFor="name">ชื่อตำแหน่ง *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingPosition?.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="department_id">แผนก</Label>
                <Select name="department_id" defaultValue={editingPosition?.department_id || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกแผนก" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">รายละเอียด</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingPosition?.description || ''}
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
        ) : positions.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>ยังไม่มีตำแหน่ง</p>
          </div>
        ) : (
          positions.map((pos, index) => (
            <motion.div
              key={pos.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="card-interactive">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-accent/50 flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-accent-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{pos.name}</h3>
                        <p className="text-sm text-primary">
                          {pos.department?.name || 'ไม่ระบุแผนก'}
                        </p>
                        {pos.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {pos.description}
                          </p>
                        )}
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
                            setEditingPosition(pos);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          แก้ไข
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setDeletingId(pos.id);
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
        title="ลบตำแหน่ง"
        description="คุณแน่ใจหรือไม่ที่จะลบตำแหน่งนี้? พนักงานที่มีตำแหน่งนี้จะไม่มีตำแหน่งสังกัด"
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </DashboardLayout>
  );
}
