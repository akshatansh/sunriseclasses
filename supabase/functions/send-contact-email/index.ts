import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { name, phone, email, course, message } = await req.json();

    if (!name || !phone || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/contact_submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
      },
      body: JSON.stringify({
        name,
        phone,
        email: email || null,
        course: course || null,
        message,
      }),
    });

    if (!insertResponse.ok) {
      console.error("Database insert failed:", await insertResponse.text());
      return new Response(
        JSON.stringify({ error: "Failed to save submission" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const toEmail = Deno.env.get("CONTACT_TO_EMAIL") || "sunriseclasses@gmail.com";
    /** Use a domain you verify in Resend, or Resend's test sender for development */
    const fromEmail =
      Deno.env.get("RESEND_FROM") || "Sunrise Classes <onboarding@resend.dev>";

    const safe = {
      name: escapeHtml(String(name).trim()),
      phone: escapeHtml(String(phone).trim()),
      email: email ? escapeHtml(String(email).trim()) : "",
      course: course ? escapeHtml(String(course).trim()) : "",
      message: escapeHtml(String(message).trim()),
    };

    let emailSent = false;
    if (resendKey) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [toEmail],
            subject: `New inquiry: ${String(name).trim().slice(0, 80)}`,
            html: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="background-color: #0f2a5c; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0;">New Contact Form Submission</h2>
    <p style="margin: 5px 0 0 0; font-size: 14px;">Sunrise Classes & Academy</p>
  </div>

  <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
    <p><strong>Student Name:</strong> ${safe.name}</p>
    <p><strong>Phone:</strong> ${safe.phone}</p>
    <p><strong>Email:</strong> ${safe.email || "Not provided"}</p>
    <p><strong>Course Interested:</strong> ${safe.course || "Not specified"}</p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

    <h3 style="color: #0f2a5c;">Message:</h3>
    <p style="white-space: pre-wrap; background-color: white; padding: 15px; border-left: 4px solid #f5a623;">
${safe.message}
    </p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

    <p style="font-size: 12px; color: #999;">
      Received: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
    </p>
  </div>
</div>
          `,
          }),
        });

        if (emailResponse.ok) {
          emailSent = true;
        } else {
          console.error("Email send failed:", await emailResponse.text());
        }
      } catch (emailError) {
        console.error("Email service error:", emailError);
      }
    } else {
      console.warn("RESEND_API_KEY not set — submission saved but no email sent.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Submission received successfully",
        emailSent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
