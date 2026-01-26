import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBudgetEmail(email: string, clientName: string, portalUrl: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'ODEPLAC PRO <onboarding@resend.dev>',
      to: [email],
      subject: 'Tu presupuesto está listo - ODEPLAC PRO',
      html: `
        <h1>Hola ${clientName},</h1>
        <p>Tu presupuesto ya está disponible en el portal del cliente.</p>
        <p>Puedes acceder haciendo clic en el siguiente enlace:</p>
        <a href="${portalUrl}">${portalUrl}</a>
        <br/>
        <p>Atentamente,<br/>El equipo de ODEPLAC</p>
      `,
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}
