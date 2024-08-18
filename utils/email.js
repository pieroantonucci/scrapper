import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function enviarNotificacion(rut, demandas) {
  const emailContent = demandas.map(d => `${d.rol} - ${d.tribunal} - ${d.detalles.fecha_ing_causa} - ${d.detalles.caratulado}`).join('\n');

  await resend.emails.send({
    to: "piero@reveschile.com",
    from: "piero@reveschile.com",
    subject: `Nuevas demandas encontradas para el RUT: ${rut}`,
    text: `Se encontraron nuevas demandas:\n${emailContent}`,
  });
}
