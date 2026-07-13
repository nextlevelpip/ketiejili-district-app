import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MNOTIFY_API_KEY = Deno.env.get('MNOTIFY_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async () => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Count souls registered today
    const { count: registeredToday, error: err1 } = await supabase
      .from('souls')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    if (err1) throw err1;

    // 2. Count souls currently active in the grounding journey
    const { count: activeSouls, error: err2 } = await supabase
      .from('souls')
      .select('*', { count: 'exact', head: true })
      .eq('follow_up_status', 'active');

    if (err2) throw err2;

    // 3. Count souls completely ready for the main church database handover
    const { count: readyForMain, error: err3 } = await supabase
      .from('souls')
      .select('*', { count: 'exact', head: true })
      .eq('follow_up_status', 'ready_for_main_system');

    if (err3) throw err3;

   // 4. Draft the pastoral report summary using spiritual language
    const reportMessage = "Peace be with you Pastor. The Lord has added " + (registeredToday || 0) + " new believers today. We have " + (activeSouls || 0) + " souls currently growing in grace. God bless your ministry.";

    // 5. Deliver the summary to your phone
    const response = await fetch(
      `https://api.mnotify.com/api/sms/quick?key=${MNOTIFY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: ["233541437815"], // Your verified personal number
          sender: "Ketiejili",
          message: reportMessage,
          is_schedule: false
        }),
      }
    );

    const result = await response.json();
    return new Response(JSON.stringify({ success: true, result }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});