import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth state changes - Supabase will automatically handle the recovery token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, session);
      
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the recovery link, session is ready
        setSessionReady(true);
        setError(null);
      } else if (event === 'SIGNED_IN' && session) {
        // Session restored or user signed in after recovery
        setSessionReady(true);
        setError(null);
      }
    });

    // Also check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        // Check URL for recovery token (hash fragment)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        
        if (type === 'recovery' && accessToken) {
          // Token is in URL, Supabase should handle it automatically
          // Wait a moment for Supabase to process
          setTimeout(() => {
            supabase.auth.getSession().then(({ data: { session: retrySession } }) => {
              if (retrySession) {
                setSessionReady(true);
              } else {
                setError('ลิงก์รีเซ็ตรหัสผ่านหมดอายุหรือไม่ถูกต้อง');
              }
            });
          }, 1000);
        } else if (!window.location.hash && !window.location.search) {
          // No token in URL at all
          setError('ลิงก์รีเซ็ตรหัสผ่านหมดอายุหรือไม่ถูกต้อง');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'รหัสผ่านไม่ตรงกัน',
        description: 'กรุณากรอกรหัสผ่านให้ตรงกันทั้งสองช่อง',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'รหัสผ่านสั้นเกินไป',
        description: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: 'เปลี่ยนรหัสผ่านสำเร็จ',
        description: 'คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว',
      });
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-destructive">ลิงก์ไม่ถูกต้อง</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate('/auth')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                กลับไปหน้าเข้าสู่ระบบ
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (success) {
  // Show loading while checking session
  if (!sessionReady && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">กำลังตรวจสอบลิงก์...</p>
        </motion.div>
      </div>
    );
  }

  return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <CardTitle className="text-success">เปลี่ยนรหัสผ่านสำเร็จ!</CardTitle>
              <CardDescription>คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate('/auth')}>
                เข้าสู่ระบบ
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>ตั้งรหัสผ่านใหม่</CardTitle>
            <CardDescription>กรุณากรอกรหัสผ่านใหม่ของคุณ</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่านใหม่</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  required
                  minLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'เปลี่ยนรหัสผ่าน'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
