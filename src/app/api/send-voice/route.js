import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Unlike SMS, voice requires reading FormData (the actual MP3 file)
    const formData = await request.formData();
    const apiKey = process.env.SMS_API_KEY;

    if (!apiKey) {
      throw new Error('SERVER FAULT: SMS API Key is missing.');
    }

    // Connect to the MNotify Voice API
    const mNotifyVoiceUrl = `https://api.mnotify.com/api/voice/quick?key=${apiKey}`;

    // Prepare the payload exactly as MNotify demands for Voice
    const mNotifyPayload = new FormData();
    mNotifyPayload.append('campaign', 'AltarConnect Broadcast');
    mNotifyPayload.append('file', formData.get('file')); // The MP3 file
    mNotifyPayload.append('is_schedule', 'false');
    
    // Attach all selected phone numbers
    const recipients = JSON.parse(formData.get('recipients'));
    recipients.forEach(phone => {
      mNotifyPayload.append('recipient[]', phone);
    });

    const response = await fetch(mNotifyVoiceUrl, {
      method: 'POST',
      body: mNotifyPayload,
      // Note: Do NOT set Content-Type header when sending FormData via fetch. 
      // The browser/Node automatically sets the correct boundaries.
    });

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error(data.message || 'mNotify rejected the voice transmission.');
    }

    return NextResponse.json({ success: true, data });
    
  } catch (error) {
    console.error("Voice Bridge Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}