import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

// ============================================
// TYPES
// ============================================

export interface UserData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

export interface VerificationResult {
    success: boolean;
    error?: string;
    userId?: string;
}

// ============================================
// CODE GENERATION
// ============================================

export function generateCode(length = 6): string {
    return Array.from({ length }, () => Math.floor(Math.random() * 10)).join(
        ""
    );
}

// ============================================
// EMAIL TEMPLATE
// ============================================

export function getCodeEmailTemplate(name: string, code: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;">
  <table width="100%" cellspacing="0" cellpadding="0" style="min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" style="max-width:400px;background:white;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:40px 32px;text-align:center;">
              <div style="width:56px;height:56px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:14px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;">
                <span style="color:white;font-size:28px;line-height:56px;">📅</span>
              </div>
              <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">Cześć ${name}!</h1>
              <p style="margin:0 0 24px;color:#71717a;font-size:15px;">Twój kod weryfikacyjny:</p>
              <div style="background:#f4f4f5;border-radius:12px;padding:20px;margin:0 0 24px;">
                <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#18181b;">${code}</span>
              </div>
              <p style="margin:0;color:#a1a1aa;font-size:13px;">Kod wygasa za 10 minut</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#fafafa;border-radius:0 0 16px 16px;text-align:center;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">
                © ${new Date().getFullYear()} Grafiki. Wszystkie prawa zastrzeżone.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getPasswordResetCodeTemplate(
    name: string,
    code: string
): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;">
  <table width="100%" cellspacing="0" cellpadding="0" style="min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" style="max-width:400px;background:white;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:40px 32px;text-align:center;">
              <div style="width:56px;height:56px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:14px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;">
                <span style="color:white;font-size:28px;line-height:56px;">🔐</span>
              </div>
              <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">Reset hasła</h1>
              <p style="margin:0 0 24px;color:#71717a;font-size:15px;">Cześć ${name}, oto Twój kod do zresetowania hasła:</p>
              <div style="background:#f4f4f5;border-radius:12px;padding:20px;margin:0 0 24px;">
                <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#18181b;">${code}</span>
              </div>
              <p style="margin:0;color:#a1a1aa;font-size:13px;">Kod wygasa za 10 minut. Jeśli nie prosiłeś o reset, zignoruj tę wiadomość.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#fafafa;border-radius:0 0 16px 16px;text-align:center;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">
                © ${new Date().getFullYear()} Grafiki. Wszystkie prawa zastrzeżone.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================
// SERVER FUNCTIONS
// ============================================

export async function createVerificationCode(
    email: string,
    userData: UserData,
    type: "signup" | "reset_password" = "signup"
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Delete old codes for this email
    await supabase
        .from("verification_codes")
        .delete()
        .eq("email", email)
        .eq("type", type);

    // Insert new code
    const { error } = await supabase.from("verification_codes").insert({
        email,
        code,
        type,
        expires_at: expiresAt.toISOString(),
        user_data: userData,
    });

    if (error) {
        console.error("DB error:", error);
        return { success: false, error: "Błąd bazy danych" };
    }

    // Send email
    try {
        const template =
            type === "signup"
                ? getCodeEmailTemplate(userData.firstName, code)
                : getPasswordResetCodeTemplate(
                      userData.firstName || "Użytkowniku",
                      code
                  );

        await sendEmail({
            to: email,
            subject:
                type === "signup"
                    ? "Kod weryfikacyjny - Grafiki"
                    : "Reset hasła - Grafiki",
            html: template,
        });
        return { success: true };
    } catch (err) {
        console.error("Email error:", err);
        return { success: false, error: "Nie udało się wysłać emaila" };
    }
}

export async function verifyCodeAndCreateUser(
    email: string,
    code: string
): Promise<VerificationResult> {
    const supabase = await createClient();

    // Find valid code
    const { data: codeData, error: findError } = await supabase
        .from("verification_codes")
        .select("*")
        .eq("email", email)
        .eq("code", code)
        .eq("type", "signup")
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

    if (findError || !codeData) {
        return { success: false, error: "Nieprawidłowy lub wygasły kod" };
    }

    const userData = codeData.user_data as UserData;

    // Use Admin client to create user (bypasses email verification)
    const adminClient = createAdminClient();

    // Check if user already exists using admin client
    const { data: existingUser } = await adminClient.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(
        (u) => u.email === userData.email
    );

    if (userExists) {
        return { success: false, error: "Użytkownik już istnieje" };
    }

    // Create user with Admin API - skips email confirmation
    const { data: authData, error: authError } =
        await adminClient.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true, // Mark email as already confirmed
            user_metadata: {
                first_name: userData.firstName,
                last_name: userData.lastName,
                full_name: `${userData.firstName} ${userData.lastName}`,
            },
        });

    if (authError) {
        console.error("Auth error:", authError);
        return { success: false, error: authError.message };
    }

    // Mark code as used
    await supabase
        .from("verification_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", codeData.id);

    return { success: true, userId: authData.user?.id };
}

export async function createPasswordResetCode(
    email: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Delete old codes for this email
    await supabase
        .from("verification_codes")
        .delete()
        .eq("email", email)
        .eq("type", "reset_password");

    // Insert new code
    const { error } = await supabase.from("verification_codes").insert({
        email,
        code,
        type: "reset_password",
        expires_at: expiresAt.toISOString(),
        user_data: { email },
    });

    if (error) {
        console.error("DB error:", error);
        return { success: false, error: "Błąd bazy danych" };
    }

    // Send email
    try {
        await sendEmail({
            to: email,
            subject: "Reset hasła - Grafiki",
            html: getPasswordResetCodeTemplate("Użytkowniku", code),
        });
        return { success: true };
    } catch (err) {
        console.error("Email error:", err);
        return { success: false, error: "Nie udało się wysłać emaila" };
    }
}

export async function verifyPasswordResetCode(
    email: string,
    code: string
): Promise<VerificationResult> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("verification_codes")
        .select("*")
        .eq("email", email)
        .eq("code", code)
        .eq("type", "reset_password")
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

    if (error || !data) {
        return { success: false, error: "Nieprawidłowy lub wygasły kod" };
    }

    // Mark as used
    await supabase
        .from("verification_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", data.id);

    return { success: true };
}
