import { NextResponse } from 'next/server';

export async function GET() {
  // SECURITY PROTOCOL: It is highly recommended to store this in your .env.local file as MNOTIFY_API_KEY
  const apiKey = process.env.MNOTIFY_API_KEY || 'PASTE_YOUR_MNOTIFY_API_KEY_HERE'; 
  
  try {
    // 1. Fetch live SMS Balance from mNotify
    const smsResponse = await fetch(`https://api.mnotify.com/api/balance/sms?key=${apiKey}`);
    const smsData = await smsResponse.json();
    
    // 2. Fetch live Voice Balance from mNotify
    const voiceResponse = await fetch(`https://api.mnotify.com/api/balance/voice?key=${apiKey}`);
    const voiceData = await voiceResponse.json();

    // 3. Securely pass the data to your front-end dashboard
    return NextResponse.json({
      status: 'success',
      smsBalance: smsData.balance || 0,
      voiceBalance: voiceData.balance || 0
    });

  } catch (error) {
    console.error("mNotify Connection Error:", error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}