/**
 * Centralized WhatsApp API Helper for Sunrise Classes Portal.
 * Uses UltraMsg (or similar HTTP API gateways) to send automatic WhatsApp messages.
 * 
 * Replace ULTRAMSG_INSTANCE_ID and ULTRAMSG_TOKEN with your actual credentials.
 */

const ULTRAMSG_INSTANCE_ID = 'instance1023'; // Replace with your instance ID
const ULTRAMSG_TOKEN = 'your_token_here';     // Replace with your token

/**
 * Sends a WhatsApp message to a specific number.
 * Automatically formats Indian phone numbers (prefixes 91 if missing).
 * 
 * @param phone Parent/Student phone number (e.g. "9973152070")
 * @param message The text message content to send
 */
export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  // If credentials are not set, log and skip (allows developers to test without crashing)
  if (!ULTRAMSG_INSTANCE_ID || ULTRAMSG_INSTANCE_ID.includes('instance') || !ULTRAMSG_TOKEN || ULTRAMSG_TOKEN.includes('token')) {
    console.log(`[WhatsApp Sandbox Alert] Target: ${phone}\nMessage: "${message}"`);
    return false;
  }

  try {
    // Standardize phone number (strip whitespace, symbols)
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    
    // Add country code 91 for India if number is 10 digits
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const response = await fetch(`https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: ULTRAMSG_TOKEN,
        to: cleanPhone,
        body: message,
      }),
    });

    const result = await response.json();
    if (result && (result.sent === 'true' || result.success)) {
      console.log(`WhatsApp message sent successfully to ${cleanPhone}`);
      return true;
    }

    console.warn('WhatsApp API gateway returned failure:', result);
    return false;
  } catch (err) {
    console.error('Failed to send WhatsApp message via gateway:', err);
    return false;
  }
}
