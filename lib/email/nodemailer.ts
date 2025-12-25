import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html,
        });
        return { success: true };
    } catch (error) {
        console.error("Błąd wysyłania emaila:", error);
        return { success: false, error };
    }
}

export function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationCode(email: string, code: string) {
    const subject = "Kod weryfikacyjny - Grafiki";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🗓️ Grafiki</h1>
          </div>
          <p>Cześć!</p>
          <p>Twój kod weryfikacyjny to:</p>
          <div class="code">${code}</div>
          <p>Kod jest ważny przez 15 minut.</p>
          <p>Jeśli nie prosiłeś o ten kod, zignoruj tę wiadomość.</p>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Grafiki - System harmonogramów pracy</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return sendEmail({ to: email, subject, html });
}

export async function sendScheduleNotification(
    email: string,
    employeeName: string,
    organizationName: string,
    month: string,
    year: number
) {
    const subject = `Nowy grafik - ${month} ${year}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .info { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🗓️ Grafiki</h1>
          </div>
          <p>Cześć ${employeeName}!</p>
          <p>Został opublikowany nowy grafik pracy dla organizacji <strong>${organizationName}</strong>.</p>
          <div class="info">
            <p><strong>Okres:</strong> ${month} ${year}</p>
          </div>
          <p>Zaloguj się do aplikacji, aby zobaczyć szczegóły swojego harmonogramu.</p>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Grafiki - System harmonogramów pracy</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return sendEmail({ to: email, subject, html });
}
