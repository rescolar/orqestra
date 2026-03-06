import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  userName: string
) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}`;

  await resend.emails.send({
    from: "Orqestra <onboarding@resend.dev>",
    to,
    subject: "Restablecer tu contraseña — Orqestra",
    html: `
      <p>Hola ${userName},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#1E4A4A;color:#fff;text-decoration:none;border-radius:8px;">Restablecer contraseña</a></p>
      <p>Este enlace expira en 1 hora.</p>
      <p>Si no solicitaste esto, puedes ignorar este email.</p>
      <p>— Orqestra</p>
    `,
  });
}
