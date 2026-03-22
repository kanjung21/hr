import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Key, Copy, Check, Shield } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { Employee, Department, Position, EmployeeType, EmployeeStatus, AppRole } from '@/types/hr';
import { employeeTypeLabels, roleLabels } from '@/types/hr';
import { format } from 'date-fns';
import { calculateLeaveQuotas } from '@/lib/leaveQuotaCalculation';

// Password generator
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Leave quota states
  const [calculatedQuotas, setCalculatedQuotas] = useState({
    annual_leave_quota: 6,
    sick_leave_quota: 30,
    personal_leave_quota: 6,
    other_leave_quota: 5,
  });
  const [selectedEmployeeType, setSelectedEmployeeType] = useState<EmployeeType>('permanent');
  const [selectedStartDate, setSelectedStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // User account creation states
  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('employee');
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saveEmployees, setSavingEmployee] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Reset password states
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedEmployeeForReset, setSelectedEmployeeForReset] = useState<Employee | null>(null);
  const [newPasswordForReset, setNewPasswordForReset] = useState('');
  const [sendPasswordEmail, setSendPasswordEmail] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ email: string; password: string } | null>(null);
  const [showResetResult, setShowResetResult] = useState(false);
  
  // Change role states
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [selectedEmployeeForRole, setSelectedEmployeeForRole] = useState<Employee | null>(null);
  const [newRoleForEmployee, setNewRoleForEmployee] = useState<AppRole>('employee');
  const [isChangingRole, setIsChangingRole] = useState(false);
  
  // Send credentials email checkbox
  const [sendCredentialsEmail, setSendCredentialsEmail] = useState(true);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-calculate leave quotas when employee type or start date changes
  useEffect(() => {
    const updateQuotas = async () => {
      if (!editingEmployee) {
        const quotas = await calculateLeaveQuotas(selectedEmployeeType, selectedStartDate);
        setCalculatedQuotas(quotas);
      }
    };
    updateQuotas();
  }, [selectedEmployeeType, selectedStartDate, editingEmployee]);

  const fetchData = async () => {
    try {
      const [employeesRes, departmentsRes, positionsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/departments'),
        fetch('/api/positions'),
      ]);

      if (!employeesRes.ok || !departmentsRes.ok || !positionsRes.ok) {
        throw new Error('ไม่สามารถโหลดข้อมูลได้');
      }

      const [employeesData, departmentsData, positionsData] = await Promise.all([
        employeesRes.json(),
        departmentsRes.json(),
        positionsRes.json(),
      ]);

      setEmployees(employeesData);
      setDepartments(departmentsData);
      setPositions(positionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingEmployee(true);
    const formData = new FormData(e.currentTarget);
    
    const email = formData.get('email') as string;
    const employeeData = {
      employee_code: formData.get('employee_code') as string,
      prefix: formData.get('prefix') as string,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email,
      phone: formData.get('phone') as string,
      id_card_number: formData.get('id_card_number') as string,
      birth_date: formData.get('birth_date') as string || null,
      gender: formData.get('gender') as string,
      address: formData.get('address') as string,
      department_id: formData.get('department_id') as string || null,
      position_id: formData.get('position_id') as string || null,
      employee_type: formData.get('employee_type') as EmployeeType,
      start_date: formData.get('start_date') as string,
      status: (formData.get('status') as EmployeeStatus) || 'active',
      annual_leave_quota: parseInt(formData.get('annual_leave_quota') as string) || 10,
      sick_leave_quota: parseInt(formData.get('sick_leave_quota') as string) || 30,
      personal_leave_quota: parseInt(formData.get('personal_leave_quota') as string) || 6,
      other_leave_quota: parseInt(formData.get('other_leave_quota') as string) || 5,
    };

    try {
      if (editingEmployee) {
        const res = await fetch(`/api/employees/${editingEmployee.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(employeeData),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data?.error || 'อัพเดตพนักงานล้มเหลว');
        }

        toast({ title: 'อัพเดตข้อมูลสำเร็จ' });
        setIsDialogOpen(false);
        setEditingEmployee(null);
      } else {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(employeeData),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data?.error || 'เพิ่มพนักงานล้มเหลว');
        }

        toast({ title: 'เพิ่มพนักงานสำเร็จ' });

        setIsDialogOpen(false);
        setEditingEmployee(null);
        setCreateUserAccount(false);
        setGeneratedPassword('');
        setSelectedRole('employee');
      }

      fetchData();
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deletingId) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/employees/${deletingId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'ลบพนักงานล้มเหลว');
      }

      toast({ title: 'ลบพนักงานสำเร็จ' });
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

  // ฟังก์ชันรีเซ็ตรหัสผ่าน
  const handleResetPassword = async () => {
    if (!selectedEmployeeForReset?.id) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'พนักงานนี้ยังไม่มี ID',
        variant: 'destructive',
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      const password = newPasswordForReset || generatePassword();
      const res = await fetch(`/api/employees/${selectedEmployeeForReset.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'ไม่สามารถรีเซ็ตรหัสผ่านได้');
      }

      setResetPasswordResult({
        email: selectedEmployeeForReset.email || '',
        password,
      });
      setShowResetResult(true);

      toast({
        title: 'รีเซ็ตรหัสผ่านสำเร็จ',
        description: sendPasswordEmail ? 'ส่งรหัสผ่านใหม่ผ่านอีเมลแล้ว' : 'รหัสผ่านใหม่แสดงในหน้าต่าง',
      });

      setResetPasswordDialogOpen(false);
      setSelectedEmployeeForReset(null);
      setNewPasswordForReset('');
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // ฟังก์ชันเปลี่ยนบทบาท
  const handleChangeRole = async () => {
    if (!selectedEmployeeForRole?.id) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'พนักงานนี้ยังไม่มี ID',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingRole(true);
    try {
      const res = await fetch(`/api/employees/${selectedEmployeeForRole.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_role: newRoleForEmployee }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'ไม่สามารถเปลี่ยนบทบาทได้');
      }

      toast({
        title: 'เปลี่ยนบทบาทสำเร็จ',
        description: `เปลี่ยนเป็น ${roleLabels[newRoleForEmployee as AppRole]}`,
      });
      
      setChangeRoleDialogOpen(false);
      setSelectedEmployeeForRole(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsChangingRole(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const search = searchQuery.toLowerCase();
    const firstName = (emp.first_name ?? '').toLowerCase();
    const lastName = (emp.last_name ?? '').toLowerCase();
    const employeeCode = (emp.employee_code ?? '').toLowerCase();

    const matchesSearch =
      firstName.includes(search) ||
      lastName.includes(search) ||
      employeeCode.includes(search);

    const matchesDepartment = filterDepartment === 'all' || emp.department_id === filterDepartment;
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  return (
    <DashboardLayout
      title="ข้อมูลพนักงาน"
      subtitle={`ทั้งหมด ${employees.length} คน`}
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingEmployee(null)}>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มพนักงาน
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}
              </DialogTitle>
              <DialogDescription>
                กรอกข้อมูลพนักงานให้ครบถ้วน
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEmployee} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">ข้อมูลพื้นฐาน</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="employee_code">รหัสพนักงาน *</Label>
                    <Input
                      id="employee_code"
                      name="employee_code"
                      defaultValue={editingEmployee?.employee_code}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="prefix">คำนำหน้า</Label>
                    <Select name="prefix" defaultValue={editingEmployee?.prefix || 'นาย'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="นาย">นาย</SelectItem>
                        <SelectItem value="นาง">นาง</SelectItem>
                        <SelectItem value="นางสาว">นางสาว</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="gender">เพศ</Label>
                    <Select name="gender" defaultValue={editingEmployee?.gender || 'male'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">ชาย</SelectItem>
                        <SelectItem value="female">หญิง</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">ชื่อ *</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      defaultValue={editingEmployee?.first_name}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">นามสกุล *</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      defaultValue={editingEmployee?.last_name}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="id_card_number">เลขบัตรประชาชน</Label>
                    <Input
                      id="id_card_number"
                      name="id_card_number"
                      defaultValue={editingEmployee?.id_card_number || ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="birth_date">วันเกิด</Label>
                    <Input
                      id="birth_date"
                      name="birth_date"
                      type="date"
                      defaultValue={editingEmployee?.birth_date || ''}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">อีเมล *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={editingEmployee?.email || ''}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">เบอร์โทร</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={editingEmployee?.phone || ''}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">ที่อยู่</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={editingEmployee?.address || ''}
                  />
                </div>
              </div>

              {/* Work Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">ข้อมูลการทำงาน</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department_id">แผนก</Label>
                    <Select name="department_id" defaultValue={editingEmployee?.department_id || ''}>
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
                    <Label htmlFor="position_id">ตำแหน่ง</Label>
                    <Select name="position_id" defaultValue={editingEmployee?.position_id || ''}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกตำแหน่ง" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((pos) => (
                          <SelectItem key={pos.id} value={pos.id}>
                            {pos.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="employee_type">ประเภทพนักงาน</Label>
                    <Select 
                      name="employee_type" 
                      defaultValue={editingEmployee?.employee_type || 'permanent'}
                      onValueChange={(value) => !editingEmployee && setSelectedEmployeeType(value as EmployeeType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="permanent">ประจำ</SelectItem>
                        <SelectItem value="contract">สัญญาจ้าง</SelectItem>
                        <SelectItem value="parttime">พาร์ทไทม์</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="start_date">วันที่เริ่มงาน *</Label>
                    <Input
                      id="start_date"
                      name="start_date"
                      type="date"
                      defaultValue={editingEmployee?.start_date || selectedStartDate}
                      onChange={(e) => !editingEmployee && setSelectedStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">สถานะ</Label>
                    <Select name="status" defaultValue={editingEmployee?.status || 'active'}>
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
                </div>
              </div>

              {/* Leave Quota */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">สิทธิ์วันลา (ต่อปี)</h3>
                  {!editingEmployee && (
                    <span className="text-xs text-primary">✨ คำนวณอัตโนมัติตามนโยบาย</span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="annual_leave_quota">ลาพักร้อน</Label>
                    <Input
                      id="annual_leave_quota"
                      name="annual_leave_quota"
                      type="number"
                      defaultValue={editingEmployee?.annual_leave_quota ?? calculatedQuotas.annual_leave_quota}
                      key={editingEmployee ? 'edit' : `new-${calculatedQuotas.annual_leave_quota}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sick_leave_quota">ลาป่วย</Label>
                    <Input
                      id="sick_leave_quota"
                      name="sick_leave_quota"
                      type="number"
                      defaultValue={editingEmployee?.sick_leave_quota ?? calculatedQuotas.sick_leave_quota}
                      key={editingEmployee ? 'edit' : `new-${calculatedQuotas.sick_leave_quota}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="personal_leave_quota">ลากิจ</Label>
                    <Input
                      id="personal_leave_quota"
                      name="personal_leave_quota"
                      type="number"
                      defaultValue={editingEmployee?.personal_leave_quota ?? calculatedQuotas.personal_leave_quota}
                      key={editingEmployee ? 'edit' : `new-${calculatedQuotas.personal_leave_quota}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="other_leave_quota">ลาอื่นๆ</Label>
                    <Input
                      id="other_leave_quota"
                      name="other_leave_quota"
                      type="number"
                      defaultValue={editingEmployee?.other_leave_quota || 5}
                    />
                  </div>
                </div>
              </div>

              {/* User Account Creation - Only for new employees */}
              {!editingEmployee && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="create_user"
                      checked={createUserAccount}
                      onCheckedChange={(checked) => {
                        setCreateUserAccount(checked === true);
                        if (checked && !generatedPassword) {
                          setGeneratedPassword(generatePassword());
                        }
                      }}
                    />
                    <Label htmlFor="create_user" className="cursor-pointer">
                      สร้างบัญชีผู้ใช้เพื่อเข้าสู่ระบบ
                    </Label>
                  </div>
                  
                  {createUserAccount && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 pl-6"
                    >
                      <div className="p-4 bg-muted rounded-lg space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Key className="w-4 h-4" />
                          <span>ข้อมูลบัญชีผู้ใช้</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>รหัสผ่าน (สร้างอัตโนมัติ)</Label>
                            <div className="flex gap-2">
                              <Input
                                value={generatedPassword}
                                readOnly
                                className="font-mono"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setGeneratedPassword(generatePassword())}
                              >
                                🔄
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label>สิทธิ์การใช้งาน</Label>
                            <Select
                              value={selectedRole}
                              onValueChange={(v) => setSelectedRole(v as AppRole)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="employee">{roleLabels.employee}</SelectItem>
                                <SelectItem value="manager">{roleLabels.manager}</SelectItem>
                                <SelectItem value="hr">{roleLabels.hr}</SelectItem>
                                <SelectItem value="admin">{roleLabels.admin}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          * อีเมลจะใช้จากช่อง "อีเมล" ด้านบน โปรดตรวจสอบให้ถูกต้อง
                        </p>
                        
                        <div className="flex items-center gap-2 pt-2">
                          <Checkbox
                            id="send_credentials"
                            checked={sendCredentialsEmail}
                            onCheckedChange={(checked) => setSendCredentialsEmail(checked === true)}
                          />
                          <Label htmlFor="send_credentials" className="cursor-pointer text-sm">
                            ✉️ ส่งข้อมูลการเข้าสู่ระบบผ่านอีเมล
                          </Label>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={savingEmployee}>
                  {savingEmployee ? 'กำลังบันทึก...' : editingEmployee ? 'บันทึก' : 'เพิ่มพนักงาน'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Credentials Dialog */}
      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สร้างบัญชีผู้ใช้สำเร็จ</DialogTitle>
            <DialogDescription>
              กรุณาบันทึกข้อมูลนี้ไว้เพื่อแจ้งพนักงาน (รหัสผ่านจะไม่แสดงอีก)
            </DialogDescription>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">อีเมล:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{createdCredentials.email}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(createdCredentials.email, 'email')}
                    >
                      {copiedField === 'email' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">รหัสผ่าน:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{createdCredentials.password}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(createdCredentials.password, 'password')}
                    >
                      {copiedField === 'password' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  copyToClipboard(
                    `อีเมล: ${createdCredentials.email}\nรหัสผ่าน: ${createdCredentials.password}`,
                    'all'
                  );
                }}
              >
                {copiedField === 'all' ? 'คัดลอกแล้ว!' : 'คัดลอกทั้งหมด'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาชื่อ, รหัสพนักงาน..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="แผนก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกแผนก</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="active">ทำงาน</SelectItem>
                  <SelectItem value="resigned">ลาออก</SelectItem>
                  <SelectItem value="suspended">พักงาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>รหัส</TableHead>
                  <TableHead>ชื่อ-นามสกุล</TableHead>
                  <TableHead>แผนก</TableHead>
                  <TableHead>ตำแหน่ง</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>วันเริ่มงาน</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      ไม่พบข้อมูลพนักงาน
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp, index) => (
                    <motion.tr
                      key={emp.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="table-row-hover border-b"
                    >
                      <TableCell className="font-mono text-sm">{emp.employee_code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                            {emp.first_name ? emp.first_name[0] : '-'}
                          </div>
                          <div>
                            <p className="font-medium">{emp.prefix} {emp.first_name} {emp.last_name}</p>
                            <p className="text-sm text-muted-foreground">{emp.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{emp.department?.name || '-'}</TableCell>
                      <TableCell>{emp.position?.name || '-'}</TableCell>
                      <TableCell>{employeeTypeLabels[emp.employee_type]}</TableCell>
                      <TableCell>
                        <StatusBadge status={emp.status} type="employee" />
                      </TableCell>
                      <TableCell>
                        {emp.start_date ? format(new Date(emp.start_date), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingEmployee(emp);
                              setIsDialogOpen(true);
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              แก้ไข
                            </DropdownMenuItem>
                            {emp.user_id && (
                              <>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedEmployeeForReset(emp);
                                  setNewPasswordForReset('');
                                  setResetPasswordDialogOpen(true);
                                }}>
                                  <Key className="w-4 h-4 mr-2" />
                                  รีเซ็ตรหัสผ่าน
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedEmployeeForRole(emp);
                                  setNewRoleForEmployee('employee');
                                  setChangeRoleDialogOpen(true);
                                }}>
                                  <Shield className="w-4 h-4 mr-2" />
                                  เปลี่ยนบทบาท
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setDeletingId(emp.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              ลบ
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="ลบพนักงาน"
        description="คุณแน่ใจหรือไม่ที่จะลบพนักงานนี้? ข้อมูลทั้งหมดรวมถึงประวัติการลาจะถูกลบ"
        onConfirm={handleDeleteEmployee}
        isDeleting={isDeleting}
      />

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🔐 รีเซ็ตรหัสผ่าน</DialogTitle>
            <DialogDescription>
              สำหรับ {selectedEmployeeForReset?.first_name} {selectedEmployeeForReset?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new_password">รหัสผ่านใหม่</Label>
              <Input
                id="new_password"
                value={newPasswordForReset}
                onChange={(e) => setNewPasswordForReset(e.target.value)}
                placeholder={generatePassword()}
              />
              <p className="text-xs text-muted-foreground mt-2">
                ปล่อยว่างไว้เพื่อสร้างรหัสผ่านอัตโนมัติ
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="send_password_email"
                checked={sendPasswordEmail}
                onCheckedChange={(checked) => setSendPasswordEmail(checked === true)}
              />
              <Label htmlFor="send_password_email" className="cursor-pointer text-sm">
                ✉️ ส่งรหัสผ่านใหม่ผ่านอีเมล
              </Label>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setResetPasswordDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={isResettingPassword}
              className="bg-warning hover:bg-warning/90"
            >
              {isResettingPassword ? 'กำลังรีเซ็ต...' : 'รีเซ็ตรหัสผ่าน'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Result Dialog */}
      <Dialog open={showResetResult} onOpenChange={setShowResetResult}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>✅ รีเซ็ตรหัสผ่านสำเร็จ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {resetPasswordResult && (
              <>
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">อีเมล</p>
                    <div className="flex gap-2 items-center">
                      <code className="font-mono text-sm flex-1">{resetPasswordResult.email}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(resetPasswordResult.email, 'email')}
                      >
                        {copiedField === 'email' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">รหัสผ่านใหม่</p>
                    <div className="flex gap-2 items-center">
                      <code className="font-mono text-sm flex-1">{resetPasswordResult.password}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(resetPasswordResult.password, 'password')}
                      >
                        {copiedField === 'password' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                {sendPasswordEmail && (
                  <div className="p-3 bg-blue-50 text-blue-900 rounded text-sm">
                    📧 ข้อมูลการเข้าสู่ระบบได้ส่งไปที่อีเมลแล้ว
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              onClick={() => {
                setShowResetResult(false);
                fetchData();
              }}
            >
              ปิด
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🛡️ เปลี่ยนบทบาท</DialogTitle>
            <DialogDescription>
              สำหรับ {selectedEmployeeForRole?.first_name} {selectedEmployeeForRole?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new_role">บทบาทใหม่</Label>
              <Select
                value={newRoleForEmployee}
                onValueChange={(v) => setNewRoleForEmployee(v as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">{roleLabels.employee}</SelectItem>
                  <SelectItem value="manager">{roleLabels.manager}</SelectItem>
                  <SelectItem value="hr">{roleLabels.hr}</SelectItem>
                  <SelectItem value="admin">{roleLabels.admin}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-amber-50 text-amber-900 rounded text-sm">
              ⚠️ การเปลี่ยนบทบาทจะมีผลสำหรับสิทธิ์การเข้าถึงในระบบทั้งหมด
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setChangeRoleDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleChangeRole}
              disabled={isChangingRole}
            >
              {isChangingRole ? 'กำลังเปลี่ยน...' : 'เปลี่ยนบทบาท'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
