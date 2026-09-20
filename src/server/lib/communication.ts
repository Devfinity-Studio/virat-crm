import { env } from "@/env";
import { Resend } from "resend";
import twilio from "twilio";

// Initialize APIs if keys are available
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const twilioClient =
  env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
    ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
    : null;

// Mock message caching for verification and automated tests
export interface MockCommunication {
  type: "sms" | "email";
  to: string;
  subject?: string;
  body: string;
  timestamp: Date;
}

export const mockSentLogs: MockCommunication[] = [];

/**
 * Sends a real-time SMS to a target recipient.
 * Gracefully falls back to mock-logging if Twilio credentials are missing.
 */
export async function sendSMSAlert(to: string, body: string): Promise<boolean> {
  const normalizedPhone = to.startsWith("+") ? to : `+${to}`;

  if (twilioClient && env.TWILIO_PHONE_NUMBER) {
    try {
      await twilioClient.messages.create({
        body,
        from: env.TWILIO_PHONE_NUMBER,
        to: normalizedPhone,
      });
      console.log(`[SMS Gateway] Dispatched SMS to ${normalizedPhone}`);
      return true;
    } catch (err) {
      console.error(
        `[SMS Gateway Error] Failed to send SMS to ${normalizedPhone}:`,
        err,
      );
      // Fail gracefully so as to not crash mutations
    }
  }

  // Fallback Mock Logger
  console.log(`\n--- [MOCK SMS ALERT] ---`);
  console.log(`To: ${normalizedPhone}`);
  console.log(`Body: ${body}`);
  console.log(`-------------------------\n`);

  mockSentLogs.push({
    type: "sms",
    to: normalizedPhone,
    body,
    timestamp: new Date(),
  });
  return true;
}

/**
 * Sends a stylized HTML Email Alert to a target recipient.
 * Gracefully falls back to mock-logging if Resend credentials are missing.
 */
export async function sendEmailAlert(
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<boolean> {
  const unsubscribeHtml = `
    <br><br>
    <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
    <p style="font-size: 12px; color: #666;">
      Virat Bio Plaantec private limited<br>
      SECOND FLOOR, SHOP NO-213, SAHITYA ICON, NARODA GIDC, Ahmedabad, Gujarat, 382330<br><br>
      You are receiving this email because you are a registered user of Virat CRM. 
      If you wish to stop receiving these emails or delete your account, please visit our 
      <a href="https://virat-crm.vercel.app/data-deletion" style="color: #0070f3;">Data Deletion Request</a> page.
    </p>
  `;
  const finalHtml = html + unsubscribeHtml;
  
  if (resend) {
    try {
      await resend.emails.send({
        from: "Virat CRM <alerts@virat-crm.com>",
        to,
        subject,
        html: finalHtml,
        text,
      });
      console.log(`[Email Gateway] Dispatched HTML Email to ${to}`);
      return true;
    } catch (err) {
      console.error(
        `[Email Gateway Error] Failed to send email to ${to}:`,
        err,
      );
    }
  }

  // Fallback Mock Logger
  console.log(`\n--- [MOCK EMAIL ALERT] ---`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Text Body: ${text}`);
  console.log(`--------------------------\n`);

  mockSentLogs.push({
    type: "email",
    to,
    subject,
    body: text,
    timestamp: new Date(),
  });
  return true;
}
