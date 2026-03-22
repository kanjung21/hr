import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { getEmailConfig } from "../config/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ฟังก์ชันส่งอีเมลรหัสผ่านให้พนักงาน (Office365 SMTP)
const sendCredentialsEmail = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string
) => {
  try {
    const config = getEmailConfig();
    const appUrl = config.appUrl;
    
    console.log(`📧 Sending welcome email to: ${email}`);

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
        <div style="background-color: #0078D4; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">🎉 ยินดีต้อนรับสู่ระบบ HR</h1>
        </div>
        <div style="background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>สวัสดี <strong>${firstName} ${lastName}</strong></p>
          <p>ยินดีต้อนรับสู่ระบบจัดการทรัพยากรบุคคล (HR System) ของบริษัท</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0078D4;">
            <h3 style="margin-top: 0; color: #0078D4;">📝 ข้อมูลการเข้าสู่ระบบ</h3>
            <p><strong>อีเมล:</strong> <code style="background-color: #f0f0f0; padding: 5px 10px; border-radius: 4px;">${email}</code></p>
            <p><strong>รหัสผ่าน:</strong> <code style="background-color: #f0f0f0; padding: 5px 10px; border-radius: 4px; font-size: 16px; letter-spacing: 2px;">${password}</code></p>
            <p style="font-size: 12px; color: #666; margin-top: 15px;">
              ⚠️ โปรดเก็บข้อมูลนี้อย่างปลอดภัย และ<strong>เปลี่ยนรหัสผ่านในครั้งแรก</strong>ที่เข้าสู่ระบบ
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
          
          <div style="border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666;">
            <p>💡 <strong>เคล็ดลับ:</strong> ใช้รหัสผ่านที่แข็งแรง (ตัวใหญ่ ตัวเล็ก ตัวเลข และสัญลักษณ์)</p>
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
      subject: "🎉 ยินดีต้อนรับสู่ระบบ HR - ข้อมูลการเข้าสู่ระบบของคุณ",
      html: htmlContent,
      headers: new Map([
        ["X-Service", "HR-System"],
      ]),
    });

    await client.close();
    
    console.log(`✅ Welcome email sent to ${email}`);
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

    const { email, password, first_name, last_name, employee_id, role, send_email } = await req.json();

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // ตรวจสอบว่าอีเมลมีผู้ใช้งานแล้วหรือไม่
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (emailExists) {
      throw new Error("อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น");
    }

    // สร้างบัญชีผู้ใช้ (ยืนยันอีเมลโดยอัตโนมัติ)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
      },
    });

    if (createError) throw createError;

    // เพิ่มบทบาทผู้ใช้
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userData.user.id, role: role || "employee" });

    if (roleError) throw roleError;

    // เชื่อมโยงบัญชีผู้ใช้กับบันทึกพนักงาน
    if (employee_id) {
      const { error: linkError } = await supabaseAdmin
        .from("employees")
        .update({ user_id: userData.user.id })
        .eq("id", employee_id);

      if (linkError) throw linkError;
    }

    // ส่งอีเมลรหัสผ่านหากมีการร้องขอ
    if (send_email) {
      await sendCredentialsEmail(email, password, first_name, last_name);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userData.user.id,
        message: "บัญชีผู้ใช้สร้างสำเร็จ" + (send_email ? " และส่งอีเมลแล้ว" : "")
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
