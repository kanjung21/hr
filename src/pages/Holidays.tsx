import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Trash2, Edit, Search, Upload, Copy } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, parse, isValid } from 'date-fns';
import { th } from 'date-fns/locale';

interface CompanyHoliday {
  id: string;
  holiday_date: string;
  name: string;
  description: string | null;
  year: number;
}

export default function HolidaysPage() {
  const { toast } = useToast();
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CompanyHoliday | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [copyFromYear, setCopyFromYear] = useState(new Date().getFullYear() - 1);
  const [copyToYear, setCopyToYear] = useState(new Date().getFullYear() + 1);
  const [importing, setImporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_holidays')
        .select('*')
        .eq('year', selectedYear)
        .order('holiday_date', { ascending: true });

      if (error) throw error;
      setHolidays(data || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHoliday = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const holidayDate = formData.get('holiday_date') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const year = new Date(holidayDate).getFullYear();

    try {
      if (editingHoliday) {
        const { error } = await supabase
          .from('company_holidays')
          .update({ holiday_date: holidayDate, name, description, year })
          .eq('id', editingHoliday.id);
        if (error) throw error;
        toast({ title: 'แก้ไขวันหยุดสำเร็จ' });
      } else {
        const { error } = await supabase
          .from('company_holidays')
          .insert({ holiday_date: holidayDate, name, description, year });
        if (error) throw error;
        toast({ title: 'เพิ่มวันหยุดสำเร็จ' });
      }
      setIsDialogOpen(false);
      setEditingHoliday(null);
      setSelectedYear(year);
      fetchHolidays();
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message?.includes('duplicate') 
          ? 'วันหยุดนี้มีอยู่ในระบบแล้ว' 
          : error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteHoliday = async () => {
    if (!deletingId) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('company_holidays')
        .delete()
        .eq('id', deletingId);
      if (error) throw error;
      toast({ title: 'ลบวันหยุดสำเร็จ' });
      fetchHolidays();
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

  const openEditDialog = (holiday: CompanyHoliday) => {
    setEditingHoliday(holiday);
    setIsDialogOpen(true);
  };

  // Parse CSV/Excel file
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseDate = (dateStr: string): string | null => {
    // Try various date formats
    const formats = [
      'yyyy-MM-dd',
      'dd/MM/yyyy',
      'd/M/yyyy',
      'dd-MM-yyyy',
      'd-M-yyyy',
    ];

    for (const fmt of formats) {
      const parsed = parse(dateStr, fmt, new Date());
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    }
    return null;
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      // Skip header row
      const dataLines = lines.slice(1);
      const holidaysToInsert: { holiday_date: string; name: string; description: string; year: number }[] = [];
      const errors: string[] = [];

      for (let i = 0; i < dataLines.length; i++) {
        const cols = parseCSVLine(dataLines[i]);
        if (cols.length < 2) continue;

        const dateStr = parseDate(cols[0]);
        const name = cols[1]?.replace(/^"|"$/g, '');
        const description = cols[2]?.replace(/^"|"$/g, '') || '';

        if (!dateStr) {
          errors.push(`บรรทัด ${i + 2}: รูปแบบวันที่ไม่ถูกต้อง "${cols[0]}"`);
          continue;
        }

        if (!name) {
          errors.push(`บรรทัด ${i + 2}: ไม่มีชื่อวันหยุด`);
          continue;
        }

        holidaysToInsert.push({
          holiday_date: dateStr,
          name,
          description,
          year: new Date(dateStr).getFullYear(),
        });
      }

      if (holidaysToInsert.length > 0) {
        const { error } = await supabase
          .from('company_holidays')
          .upsert(holidaysToInsert, { onConflict: 'holiday_date' });

        if (error) throw error;

        toast({
          title: 'นำเข้าสำเร็จ',
          description: `เพิ่มวันหยุด ${holidaysToInsert.length} รายการ${errors.length > 0 ? ` (ข้าม ${errors.length} รายการที่มีปัญหา)` : ''}`,
        });
        fetchHolidays();
      } else {
        toast({
          title: 'ไม่พบข้อมูลที่ถูกต้อง',
          description: errors.slice(0, 3).join('\n'),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCopyHolidays = async () => {
    try {
      // Fetch holidays from source year
      const { data: sourceHolidays, error: fetchError } = await supabase
        .from('company_holidays')
        .select('*')
        .eq('year', copyFromYear);

      if (fetchError) throw fetchError;

      if (!sourceHolidays || sourceHolidays.length === 0) {
        toast({
          title: 'ไม่พบข้อมูล',
          description: `ไม่มีวันหยุดในปี ${copyFromYear + 543}`,
          variant: 'destructive',
        });
        return;
      }

      // Create new holidays for target year
      const yearDiff = copyToYear - copyFromYear;
      const newHolidays = sourceHolidays.map(h => {
        const oldDate = parseISO(h.holiday_date);
        const newDate = new Date(oldDate);
        newDate.setFullYear(oldDate.getFullYear() + yearDiff);
        
        return {
          holiday_date: format(newDate, 'yyyy-MM-dd'),
          name: h.name,
          description: h.description,
          year: copyToYear,
        };
      });

      const { error: insertError } = await supabase
        .from('company_holidays')
        .upsert(newHolidays, { onConflict: 'holiday_date' });

      if (insertError) throw insertError;

      toast({
        title: 'คัดลอกสำเร็จ',
        description: `คัดลอก ${newHolidays.length} วันหยุดจากปี ${copyFromYear + 543} ไปปี ${copyToYear + 543}`,
      });
      setIsCopyDialogOpen(false);
      setSelectedYear(copyToYear);
      fetchHolidays();
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredHolidays = holidays.filter(
    (h) =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDayOfWeek = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = parseISO(dateStr);
    if (!isValid(date)) return '-';
    return format(date, 'EEEE', { locale: th });
  };

  return (
    <DashboardLayout
      title="วันหยุดประจำปี"
      subtitle="จัดการวันหยุดบริษัทสำหรับการคำนวณวันลา"
      actions={
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,.txt"
            onChange={handleImportFile}
            className="hidden"
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="w-4 h-4 mr-2" />
            {importing ? 'กำลังนำเข้า...' : 'นำเข้าไฟล์'}
          </Button>
          <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                คัดลอกข้ามปี
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>คัดลอกวันหยุดข้ามปี</DialogTitle>
                <DialogDescription>
                  คัดลอกวันหยุดจากปีหนึ่งไปยังอีกปี (วันที่จะถูกปรับตามปีปลายทาง)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>จากปี</Label>
                  <Select
                    value={copyFromYear.toString()}
                    onValueChange={(v) => setCopyFromYear(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          ปี {year + 543}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ไปยังปี</Label>
                  <Select
                    value={copyToYear.toString()}
                    onValueChange={(v) => setCopyToYear(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          ปี {year + 543}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsCopyDialogOpen(false)}>
                    ยกเลิก
                  </Button>
                  <Button onClick={handleCopyHolidays}>
                    คัดลอก
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingHoliday(null);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มวันหยุด
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingHoliday ? 'แก้ไขวันหยุด' : 'เพิ่มวันหยุด'}
                </DialogTitle>
                <DialogDescription>
                  กรอกรายละเอียดวันหยุดประจำปีของบริษัท
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveHoliday} className="space-y-4">
                <div>
                  <Label htmlFor="holiday_date">วันที่ *</Label>
                  <Input
                    id="holiday_date"
                    name="holiday_date"
                    type="date"
                    defaultValue={editingHoliday?.holiday_date || ''}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">ชื่อวันหยุด *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="เช่น วันขึ้นปีใหม่"
                    defaultValue={editingHoliday?.name || ''}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">รายละเอียด</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                    defaultValue={editingHoliday?.description || ''}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingHoliday(null);
                    }}
                  >
                    ยกเลิก
                  </Button>
                  <Button type="submit">
                    {editingHoliday ? 'บันทึก' : 'เพิ่มวันหยุด'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              วันหยุดประจำปี {selectedYear + 543}
            </CardTitle>
            <CardDescription>
              วันหยุดที่กำหนดจะไม่ถูกนับรวมในการคำนวณวันลา
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาวันหยุด..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      ปี {year + 543}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : filteredHolidays.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>ยังไม่มีวันหยุดที่กำหนดสำหรับปี {selectedYear + 543}</p>
                <p className="text-sm mt-1">คลิก "เพิ่มวันหยุด" เพื่อเริ่มต้น</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">วันที่</TableHead>
                      <TableHead className="w-[120px]">วัน</TableHead>
                      <TableHead>ชื่อวันหยุด</TableHead>
                      <TableHead>รายละเอียด</TableHead>
                      <TableHead className="text-right w-[100px]">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHolidays.map((holiday) => (
                      <TableRow key={holiday.id}>
                        <TableCell className="font-medium">
                          {format(parseISO(holiday.holiday_date), 'd MMMM yyyy', { locale: th })}
                        </TableCell>
                        <TableCell>
                          {getDayOfWeek(holiday.holiday_date)}
                        </TableCell>
                        <TableCell>{holiday.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {holiday.description || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(holiday)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeletingId(holiday.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>หมายเหตุ:</strong> วันหยุดสุดสัปดาห์ (เสาร์-อาทิตย์) จะถูกยกเว้นโดยอัตโนมัติในการคำนวณวันลา
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>การนำเข้าไฟล์:</strong> ใช้ไฟล์ CSV โดยมีคอลัมน์ ได้แก่ วันที่, ชื่อวันหยุด, รายละเอียด (รูปแบบวันที่: yyyy-MM-dd หรือ dd/MM/yyyy)
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <DeleteConfirmDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      title="ลบวันหยุด"
      description="คุณแน่ใจหรือไม่ที่จะลบวันหยุดนี้?"
      onConfirm={handleDeleteHoliday}
      isDeleting={isDeleting}
    />
    </DashboardLayout>
  );
}
