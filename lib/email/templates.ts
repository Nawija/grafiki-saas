export function verificationEmailTemplate(code: string, name?: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kod weryfikacyjny</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
          <td>
            <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h1 style="color: #18181b; font-size: 24px; margin: 0 0 16px 0;">
                🗓️ Grafiki - Weryfikacja konta
              </h1>
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                ${
                    name ? `Cześć ${name}!` : "Cześć!"
                } Oto Twój kod weryfikacyjny:
              </p>
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #18181b;">
                  ${code}
                </span>
              </div>
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
                Kod jest ważny przez 15 minut. Jeśli nie prosiłeś o ten kod, zignoruj tę wiadomość.
              </p>
            </div>
            <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
              © ${new Date().getFullYear()} Grafiki - System harmonogramów pracy
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function schedulePublishedTemplate(
    employeeName: string,
    month: string,
    year: number,
    organizationName: string
): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nowy grafik</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
          <td>
            <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h1 style="color: #18181b; font-size: 24px; margin: 0 0 16px 0;">
                📅 Nowy grafik został opublikowany!
              </h1>
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Cześć ${employeeName}!
              </p>
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Grafik pracy na <strong>${month} ${year}</strong> w organizacji <strong>${organizationName}</strong> został właśnie opublikowany.
              </p>
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
                <p style="color: #166534; font-size: 14px; margin: 0;">
                  ✅ Zaloguj się do aplikacji, aby zobaczyć swój harmonogram pracy.
                </p>
              </div>
              <a href="${
                  process.env.NEXT_PUBLIC_APP_URL
              }/grafik" style="display: inline-block; background-color: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                Zobacz grafik
              </a>
            </div>
            <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
              © ${new Date().getFullYear()} Grafiki - System harmonogramów pracy
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function passwordResetTemplate(code: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset hasła</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
          <td>
            <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h1 style="color: #18181b; font-size: 24px; margin: 0 0 16px 0;">
                🔐 Reset hasła
              </h1>
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Otrzymaliśmy prośbę o reset hasła. Użyj poniższego kodu:
              </p>
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #18181b;">
                  ${code}
                </span>
              </div>
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
                Kod jest ważny przez 15 minut. Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.
              </p>
            </div>
            <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
              © ${new Date().getFullYear()} Grafiki - System harmonogramów pracy
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
