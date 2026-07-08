import { NextResponse } from 'next/server';

// CRITICAL FIX: This forces Next.js to fetch fresh data every time.
// Without this, Next.js caches the first response (which was 0) forever!
export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.MNOTIFY_API_KEY; 
  
  // 1. Check if the key exists in the current environment
  if (!apiKey) {
    return NextResponse.json({ 
      status: 'error', 
      message: "API Key missing. If on a live server, add MNOTIFY_API_KEY to your Environment Variables.",
      smsBalance: "ERR",
      voiceBalance: "ERR"
    });
  }
  
  try {
    // 2. Fetch SMS Balance
    const smsResponse = await fetch(`https://api.mnotify.com/api/balance/sms?key=${apiKey}`);
    const smsData = await smsResponse.json();
    
    // 3. Fetch Voice Balance
    const voiceResponse = await fetch(`https://api.mnotify.com/api/balance/voice?key=${apiKey}`);
    const voiceData = await voiceResponse.json();

    // 4. Validate mNotify's actual response status
    if (smsData.status === 'error' || voiceData.status === 'error') {
       return NextResponse.json({ 
         status: 'error', 
         message: "mNotify rejected the connection. Check if the API key is correct.",
         smsBalance: "ERR",
         voiceBalance: "ERR"
       });
    }

    // 5. Safely extract balances without defaulting to a silent 0
    const finalSmsBalance = smsData.balance ?? smsData.summary?.balance ?? "0";
    const finalVoiceBalance = voiceData.balance ?? voiceData.summary?.balance ?? "0";

    return NextResponse.json({
      status: 'success',
      smsBalance: finalSmsBalance,
      voiceBalance: finalVoiceBalance
    });

  } catch (error) {
    console.error("mNotify Connection Error:", error);
    return NextResponse.json({ 
      status: 'error', 
      message: error.message,
      smsBalance: "ERR",
      voiceBalance: "ERR"
    }, { status: 500 });
  }
}