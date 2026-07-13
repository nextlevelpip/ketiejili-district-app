import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MNOTIFY_API_KEY = Deno.env.get('MNOTIFY_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BUCKET_URL = "https://wkwvrwyjdrmpbrsajvie.supabase.co/storage/v1/object/public/voice_messages";

serve(async (req) => {
  try {
    // 1. Pull active souls
    const { data: souls, error: fetchError } = await supabase
      .from('souls')
      .select('id, full_name, phone_number, current_day, language')
      .eq('follow_up_status', 'active');

    if (fetchError) throw fetchError;
    if (!souls || souls.length === 0) {
       return new Response(JSON.stringify({ success: true, message: "No active souls to process." }), { status: 200 });
    }

    let totalProcessed = 0;

    // 2. Loop through the flock
    for (const soul of souls) {
      if (!soul.phone_number) continue;

      const nextDay = soul.current_day + 1;
      const soulPhone = soul.phone_number;
      
      // Format the language to exactly match your Voice Studio (e.g., "English")
      const safeLanguage = soul.language ? soul.language.charAt(0).toUpperCase() + soul.language.slice(1).toLowerCase() : 'English';
      
      // Construct the exact file name (e.g., "Day_2_English.mp3")
      const fileName = `Day_${nextDay}_${safeLanguage}.mp3`;
      const dailyAudioUrl = `${BUCKET_URL}/${fileName}`;

      try {
        const audioFileResponse = await fetch(dailyAudioUrl);
        
        // Only send if the file actually exists in the bucket
        if (audioFileResponse.ok) {
            const audioBlob = await audioFileResponse.blob();
            const voiceData = new FormData();
            voiceData.append("campaign", `Ketiejili Day ${nextDay} - ${safeLanguage}`);
            voiceData.append("recipient[]", soulPhone);
            voiceData.append("file", audioBlob, fileName);
            voiceData.append("is_schedule", "false");

            await fetch(`https://api.mnotify.com/api/voice/quick?key=${MNOTIFY_API_KEY}`, {
              method: 'POST',
              headers: { 'Accept': 'application/json' },
              body: voiceData,
            });
        } else {
            console.warn(`Audio file missing for: ${fileName}`);
        }
      } catch (voiceErr: any) {
         console.error(`Day ${nextDay} voice failed silently:`, voiceErr.message);
      }

      // Graduate or update the soul
      if (nextDay >= 7) {
        await supabase
          .from('souls')
          .update({ current_day: nextDay, follow_up_status: 'ready_for_main_system' })
          .eq('id', soul.id);
      } else {
        await supabase
          .from('souls')
          .update({ current_day: nextDay })
          .eq('id', soul.id);
      }

      totalProcessed++;
    }

    return new Response(JSON.stringify({ success: true, processed: totalProcessed }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});