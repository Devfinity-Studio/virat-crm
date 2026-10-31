/**
 * Universal Communication Service (Email & SMS)
 * Graceful fallback logging for notification dispatch.
 */

export async function sendEmailAlert(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  console.log(`[Email Dispatch] To: ${opts.to} | Subject: ${opts.subject}`);
  return true;
}

export async function sendSMSAlert(opts: {
  to: string;
  body: string;
}): Promise<boolean> {
  console.log(`[SMS Dispatch] To: ${opts.to} | Body: ${opts.body}`);
  return true;
}
