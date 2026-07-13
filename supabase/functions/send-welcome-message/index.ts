import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const MNOTIFY_API_KEY = Deno.env.get('MNOTIFY_API_KEY');
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

    // Package the payload
    const voiceData = new FormData();
    voiceData.append("campaign", `Ketiejili Welcome - ${safeLanguage}`);
    voiceData.append("recipient[]", soulPhone); 
    voiceData.append("file", audioBlob, fileName);
    voiceData.append("is_schedule", "false");

    // Send to mNotify
    const voiceResponse = await fetch(
      `https://api.mnotify.com/api/voice/quick?key=${MNOTIFY_API_KEY}`,
      { method: 'POST', headers: { 'Accept': 'application/json' }, body: voiceData }
    );

    const voiceResult = await voiceResponse.json();
    return new Response(JSON.stringify({ success: true, voice: voiceResult }), { status: 200 });
    
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});