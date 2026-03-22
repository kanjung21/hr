import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { user_id, new_role } = await req.json();

    if (!user_id || !new_role) {
      throw new Error("User ID and new role are required");
    }

    // ตรวจสอบว่าบทบาทนั้นถูกต้อง
    const validRoles = ["admin", "hr", "manager", "employee"];
    if (!validRoles.includes(new_role)) {
      throw new Error("Invalid role. Must be one of: admin, hr, manager, employee");
    }

    // ลบบทบาทเก่า
    const { error: deleteError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", user_id);

    if (deleteError) throw deleteError;

    // เพิ่มบทบาทใหม่
    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id, role: new_role });

    if (insertError) throw insertError;

    console.log(`Role updated for user ${user_id} to ${new_role} by ${requestingUser.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `บทบาทอัปเดตเป็น ${new_role} สำเร็จ`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Update role error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
