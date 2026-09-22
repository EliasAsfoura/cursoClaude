import { Resend } from "resend";

type ContactPayload = { name: string; email: string; msg: string };

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ContactPayload>;
  const { name, email, msg } = body;

  if (!name?.trim() || !email?.trim() || !msg?.trim()) {
    return Response.json(
      { ok: false, error: "Faltan campos requeridos." },
      { status: 400 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL!,
      to: process.env.CONTACT_EMAIL!,
      replyTo: email,
      subject: `Nuevo mensaje de contacto de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\n${msg}`,
    });

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { ok: false, error: "No se pudo enviar el correo." },
      { status: 500 }
    );
  }
}
