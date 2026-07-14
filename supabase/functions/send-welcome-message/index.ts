import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// The API Key stays hidden in the secure vault
const MNOTIFY_API_KEY = Deno.env.get('MNOTIFY_API_KEY');
const BUCKET_URL = "https://wkwvrwyjdrmpbrsajvie.supabase.co/storage/v1/object/public/voice_messages";

serve(async (req) => {
  try {
    // 1. Awaken the Supabase Admin Engine
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // 2. Fetch the live settings from your Supabase database!
    const { data: settings } = await supabaseAdmin.from('district_settings').select('*').single();
    
    // 3. Assign the database values, with fallbacks just in case
    const SENDER_ID = settings?.sender_id || 'COP-KETIEJI';
    const PASTOR_CONTACT = settings?.pastor_contact || '+233 24 000 0000';

    const payload = await req.json();
    const record = payload.record;
    const soulPhone = record.phone_number;
    
    const safeLanguage = record.language ? record.language.charAt(0).toUpperCase() + record.language.slice(1).toLowerCase() : 'English';
    const fileName = `Welcome_${safeLanguage}.mp3`;

    const audioUrl = `${BUCKET_URL}/${fileName}`;
    const audioFileResponse = await fetch(audioUrl);
    
    if (!audioFileResponse.ok) {
        return new Response(JSON.stringify({ error: `Missing file: ${fileName}` }), { status: 404 });
    }
    
    const audioBlob = await audioFileResponse.blob();

    // Send the Voice Broadcast
    const voiceData = new FormData();
    voiceData.append("campaign", `Ketiejili Welcome - ${safeLanguage}`);
    voiceData.append("recipient[]", soulPhone); 
    voiceData.append("file", audioBlob, fileName);
    voiceData.append("is_schedule", "false");

    const voiceResponse = await fetch(
      `https://api.mnotify.com/api/voice/quick?key=${MNOTIFY_API_KEY}`,
      { method: 'POST', headers: { 'Accept': 'application/json' }, body: voiceData }
    );
    const voiceResult = await voiceResponse.json();

    // Send the Follow-Up SMS using the Database Settings!
    const smsMessage = `Welcome to the Ketiejili District! Please save this number for future assistance. For immediate prayers, call the District Minister at ${PASTOR_CONTACT}. God bless you!`;
    
    const smsResponse = await fetch(
      `https://api.mnotify.com/api/sms/quick?key=${MNOTIFY_API_KEY}`,
      { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, 
        body: JSON.stringify({
          recipient: [soulPhone],
          sender: SENDER_ID,
          message: smsMessage,
          is_schedule: false,
          schedule_date: ""
        }) 
      }
    );
    const smsResult = await smsResponse.json();

    return new Response(JSON.stringify({ success: true, voice: voiceResult, sms: smsResult }), { status: 200 });
    
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});