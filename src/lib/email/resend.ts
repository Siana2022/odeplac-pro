import { Resend } from 'resend';

let resendInstance: Resend | null = null;

const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing RESEND_API_KEY environment variable');
    }
    console.warn('RESEND_API_KEY is missing. Email sending will fail.');
    return null;
  }

  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
};

export async function sendBudgetEmail(email: string, clientName: string, portalUrl: string) {
  try {
    const resend = getResend();

    if (!resend) {
      return { success: false, error: 'Resend not initialized due to missing API key' };
    }

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
