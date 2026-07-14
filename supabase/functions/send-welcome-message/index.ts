import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// The engine now pulls these directly from your Supabase Dashboard UI!
const MNOTIFY_API_KEY = Deno.env.get('MNOTIFY_API_KEY');
const SENDER_ID = Deno.env.get('MNOTIFY_SENDER_ID') || 'COP-KETIEJI';
const PASTOR_CONTACT = Deno.env.get('PASTOR_CONTACT') || '+233541437815';
const BUCKET_URL = "https://wkwvrwyjdrmpbrsajvie.supabase.co/storage/v1/object/public/voice_messages";
serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;
    const soulPhone = record.phone_number;
    
    // Format the language to exactly match your Voice Studio (e.g., "English")
    const safeLanguage = record.language ? record.language.charAt(0).toUpperCase() + record.language.slice(1).toLowerCase() : 'English';
    const fileName = `Welcome_${safeLanguage}.mp3`;

    // Grab the exact audio file
    const audioUrl = `${BUCKET_URL}/${fileName}`;
    const audioFileResponse = await fetch(audioUrl);
    
    if (!audioFileResponse.ok) {
        return new Response(JSON.stringify({ error: `Missing file: ${fileName}` }), { status: 404 });
    }
    
    const audioBlob = await audioFileResponse.blob();

    // 1. Package and Send the Voice Broadcast
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

    // 2. Package and Send the Follow-Up SMS
    // You can customize this exact message to fit your pastoral voice
    const smsMessage = `Welcome to the Ketiejili District! Please save this number for future assistance. For immediate prayers, call the District Minister at ${PASTOR_CONTACT}. God bless you!`;
    
    const smsResponse = await fetch(
      `https://api.mnotify.com/api/sms/quick?key=${MNOTIFY_API_KEY}`,
      { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        }, 
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

    // Return the results of both transmissions
    return new Response(JSON.stringify({ success: true, voice: voiceResult, sms: smsResult }), { status: 200 });
    
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});