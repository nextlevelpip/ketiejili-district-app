import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, recipients } = body;

    // Pull the secret key from your Vercel vault
    const apiKey = process.env.SMS_API_KEY;
    
    // IMPORTANT: Your Sender ID MUST be registered and approved in your BMS dashboard
    // It must be exactly 11 characters or less.
    const senderId = 'Ketiejili'; 

    if (!apiKey) {
      throw new Error('SERVER FAULT: SMS API Key is missing from Vercel environment variables.');
    }

    // Connect to the mNotify Quick SMS Endpoint as shown in the documentation
    const mNotifyUrl = `https://api.mnotify.com/api/sms/quick?key=${apiKey}`;

    const response = await fetch(mNotifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        recipient: recipients, // Array of phone numbers
        sender: senderId,
        message: message,
        is_schedule: false,
        schedule_date: ""
      })
    });

    const data = await response.json();

    // Check the specific mNotify status code (they use "success" or code "2000")
    if (data.status !== "success") {
      throw new Error(data.message || 'mNotify rejected the transmission.');
    }

    return NextResponse.json({ success: true, data });
    
  } catch (error) {
    console.error("SMS Bridge Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}