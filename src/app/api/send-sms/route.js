import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    // NOW ACCEPTING THE SENDER ID FROM THE FRONTEND
    const { message, recipients, senderId } = body;

    const apiKey = process.env.SMS_API_KEY;
    
    // Fallback to 'COP-Ketieji' just in case the frontend fails to send one
    const finalSenderId = senderId || 'COP-Ketieji'; 

    if (!apiKey) {
      throw new Error('SERVER FAULT: SMS API Key is missing from Vercel environment variables.');
    }

    const mNotifyUrl = `https://api.mnotify.com/api/sms/quick?key=${apiKey}`;

    const response = await fetch(mNotifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        recipient: recipients,
        sender: finalSenderId,
        message: message,
        is_schedule: false,
        schedule_date: ""
      })
    });

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error(data.message || 'mNotify rejected the transmission.');
    }

    return NextResponse.json({ success: true, data });
    
  } catch (error) {
    console.error("SMS Bridge Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}