import nodemailer from "nodemailer";

// Create transporter with proper Gmail configuration
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false, // Allow self-signed certificates
        },
    });
};

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
    const transporter = createTransporter();

    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ""),
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Email error:", error);
        throw error;
    }
}

// Email templates
export function getVerificationEmailTemplate(
    name: string,
    verificationUrl: string
) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Potwierdź swój email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" style="max-width: 480px; background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 32px; text-align: center;">
              <!-- Logo -->
              <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px;">📅</span>
              </div>
              
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #18181b;">
                Witaj w Grafiki!
              </h1>
              
              <p style="margin: 0 0 24px; color: #71717a; font-size: 15px;">
                Cześć ${name}, potwierdź swój adres email, aby aktywować konto.
              </p>
              
              <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">
                Potwierdź email
              </a>
              
              <p style="margin: 24px 0 0; color: #a1a1aa; font-size: 13px;">
                Link wygasa za 24 godziny. Jeśli nie rejestrowałeś się w Grafiki, zignoruj tę wiadomość.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background: #fafafa; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} Grafiki. Wszystkie prawa zastrzeżone.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function getPasswordResetEmailTemplate(name: string, resetUrl: string) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zresetuj hasło</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" style="max-width: 480px; background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 32px; text-align: center;">
              <!-- Logo -->
              <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px;">📅</span>
              </div>
              
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #18181b;">
                Reset hasła
              </h1>
              
              <p style="margin: 0 0 24px; color: #71717a; font-size: 15px;">
                Cześć ${name}, otrzymaliśmy prośbę o reset hasła do Twojego konta.
              </p>
              
              <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">
                Zresetuj hasło
              </a>
              
              <p style="margin: 24px 0 0; color: #a1a1aa; font-size: 13px;">
                Link wygasa za 1 godzinę. Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background: #fafafa; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} Grafiki. Wszystkie prawa zastrzeżone.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function getWelcomeEmailTemplate(name: string) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Witaj w Grafiki!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" style="max-width: 480px; background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 32px; text-align: center;">
              <!-- Logo -->
              <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px;">📅</span>
              </div>
              
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #18181b;">
                🎉 Konto aktywowane!
              </h1>
              
              <p style="margin: 0 0 24px; color: #71717a; font-size: 15px;">
                Cześć ${name}! Twoje konto zostało pomyślnie aktywowane. Możesz teraz zacząć korzystać z Grafiki.
              </p>
              
              <a href="${
                  process.env.NEXT_PUBLIC_APP_URL
              }/dashboard" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">
                Przejdź do panelu
              </a>
              
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
                <p style="margin: 0 0 12px; color: #52525b; font-size: 14px; font-weight: 600;">
                  Co możesz teraz zrobić?
                </p>
                <ul style="margin: 0; padding: 0; list-style: none; text-align: left;">
                  <li style="margin: 8px 0; color: #71717a; font-size: 14px;">✅ Dodaj swój zespół</li>
                  <li style="margin: 8px 0; color: #71717a; font-size: 14px;">✅ Stwórz pierwszy grafik</li>
                  <li style="margin: 8px 0; color: #71717a; font-size: 14px;">✅ Skonfiguruj szablony zmian</li>
                </ul>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background: #fafafa; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} Grafiki. Wszystkie prawa zastrzeżone.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
