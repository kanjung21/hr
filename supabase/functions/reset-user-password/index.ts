import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { getEmailConfig } from "../config/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ฟังก์ชันส่งอีเมลรหัสผ่านใหม่ (Office365 SMTP)
const sendResetPasswordEmail = async (
  email: string,
  newPassword: string
) => {
  try {
    const config = getEmailConfig();
    const appUrl = config.appUrl;

    console.log(`📧 Sending password reset email to: ${email}`);

    const client = new SMTPClient({
      connection: {
        hostname: config.smtpHost,
        port: config.smtpPort,
        tls: config.tlsEnabled,
        auth: {
          username: config.smtpUsername,
          password: config.smtpPassword,
        },
      },
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ED7014; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">🔐 การรีเซ็ตรหัสผ่าน</h1>
        </div>
        <div style="background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>สวัสดี</p>
          <p>รหัสผ่านของคุณในระบบ HR ได้รับการรีเซ็ตแล้ว</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ED7014;">
            <h3 style="margin-top: 0; color: #ED7014;">🔑 รหัสผ่านใหม่</h3>
            <p style="font-size: 18px; font-weight: bold; letter-spacing: 2px; color: #0078D4; background-color: #f0f0f0; padding: 15px; border-radius: 4px; text-align: center;">
              ${newPassword}
            </p>
            <p style="font-size: 12px; color: #666; margin-top: 15px;">
              ⚠️ โปรดเปลี่ยนรหัสผ่านของคุณในครั้งแรกที่เข้าสู่ระบบ
              <br><br>
              💡 สำหรับความปลอดภัย ขอแนะนำให้ใช้รหัสผ่านที่แข็งแรง (ตัวใหญ่ ตัวเล็ก ตัวเลข และสัญลักษณ์)
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/auth" style="
              background-color: #0078D4;
              color: white;
              padding: 12px 30px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: bold;
              display: inline-block;
            ">
              🔗 คลิกเข้าสู่ระบบ
            </a>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #FF6B6B; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 12px;">
              <strong>⚠️ สำคัญ:</strong> หากคุณไม่ได้ร้องขอการรีเซ็ตรหัสผ่านนี้ กรุณาติดต่อแผนกบุคคลในทันที
            </p>
          </div>
          
          <div style="border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666;">
            <p>หากคุณมีคำถาม กรุณาติดต่อแผนกบุคคล</p>
            <p>ขอบคุณ<br><strong>ระบบ HR</strong></p>
          </div>
        </div>
      </div>
    `;

    await client.connect();
    
    await client.send({
      from: config.smtpUsername,
      to: email,
      subject: "🔐 รหัสผ่านของคุณถูกรีเซ็ต - ข้อมูลการเข้าสู่ระบบใหม่",
      html: htmlContent,
      headers: new Map([
        ["X-Service", "HR-System"],
      ]),
    });

    await client.close();
    
    console.log(`✅ Password reset email sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error("❌ Email sending error:", error.message);
    return true; // Continue even if email fails
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ตรวจสอบการอนุญาตจากผู้ใช้ที่ได้รับการยืนยัน
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    // ตรวจสอบว่าผู้ใช้มีสิทธิ์ HR หรือ Admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    const hasPermission = roles?.some(r => r.role === "hr" || r.role === "admin");
    if (!hasPermission) {
      throw new Error("Insufficient permissions");
    }

    const { user_id, new_password, email, send_email } = await req.json();

    if (!user_id || !new_password) {
      throw new Error("User ID and new password are required");
    }

    if (new_password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // รีเซ็ตรหัสผ่านของผู้ใช้
    const { data, error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );

    if (resetError) throw resetError;

    // ส่งอีเมลหากมีการร้องขอ
    if (send_email && email) {
      await sendResetPasswordEmail(email, new_password);
    }

    console.log(`Password reset successfully for user ${user_id} by ${requestingUser.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset successfully" + (send_email ? " และส่งอีเมลแล้ว" : "")
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Reset password error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
