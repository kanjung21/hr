import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = user.email;
    if (!email) {
      // Delete the user since they don't have an email
      await supabase.auth.admin.deleteUser(user.id);
      return new Response(JSON.stringify({ valid: false, reason: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this email exists in the employees table
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, user_id")
      .eq("email", email)
      .maybeSingle();

    if (empError) {
      console.error("Error checking employee:", empError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!employee) {
      // Email not in system - delete the OAuth user
      await supabase.auth.admin.deleteUser(user.id);
      return new Response(JSON.stringify({ valid: false, reason: "email_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If employee exists but has no user_id linked, link it
    if (!employee.user_id) {
      await supabase
        .from("employees")
        .update({ user_id: user.id })
        .eq("id", employee.id);

      // Also update/create profile
      await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: email,
          first_name: user.user_metadata?.full_name?.split(" ")[0] || user.user_metadata?.given_name || null,
          last_name: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || user.user_metadata?.family_name || null,
          employee_id: employee.id,
        });

      // Assign default 'employee' role if no roles exist
      const { data: existingRoles } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id);

      if (!existingRoles || existingRoles.length === 0) {
        await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: "employee" });
      }
    }

    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
