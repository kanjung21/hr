import { useState, useRef } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  firstName: string;
  lastName: string;
  onAvatarUpdate: (newUrl: string | null) => void;
}

export function AvatarUpload({ 
  userId, 
  currentAvatarUrl, 
  firstName, 
  lastName,
  onAvatarUpdate 
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getInitials = () => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'ไฟล์ไม่ถูกต้อง',
        description: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'ไฟล์ใหญ่เกินไป',
        description: 'กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Delete old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache buster to URL
      const newAvatarUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onAvatarUpdate(newAvatarUrl);
      
      toast({
        title: 'อัปโหลดสำเร็จ',
        description: 'รูปโปรไฟล์ของคุณได้รับการอัปเดตแล้ว',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      setPreviewUrl(null);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถอัปโหลดรูปภาพได้',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentAvatarUrl) return;

    setUploading(true);

    try {
      // Delete from storage
      const path = currentAvatarUrl.split('/avatars/')[1]?.split('?')[0];
      if (path) {
        await supabase.storage.from('avatars').remove([path]);
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) throw error;

      setPreviewUrl(null);
      onAvatarUpdate(null);

      toast({
        title: 'ลบรูปโปรไฟล์สำเร็จ',
        description: 'รูปโปรไฟล์ของคุณได้ถูกลบแล้ว',
      });
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถลบรูปภาพได้',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
          <AvatarImage src={displayUrl || undefined} alt="Profile" />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Upload button */}
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute -bottom-1 -right-1 rounded-full w-8 h-8 shadow-md"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Camera className="w-4 h-4" />
        </Button>

        {/* Remove button */}
        {displayUrl && !uploading && (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -top-1 -right-1 rounded-full w-6 h-6 shadow-md"
            onClick={handleRemoveAvatar}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground text-center">
        คลิกที่ไอคอนกล้องเพื่อเปลี่ยนรูปโปรไฟล์<br />
        รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 5MB
      </p>
    </div>
  );
}
