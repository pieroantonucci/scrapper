import { enviarNotificacion } from '../../../utils/email';
import connectDB from '../../../utils/db';
import Rut from '../../../models/Rut';

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const rut = searchParams.get('rut');

  if (!rut) {
    return new Response(JSON.stringify({ error: 'RUT es requerido' }), { status: 400 });
  }

  await connectDB();

  const rutDoc = await Rut.findOne({ rut }).populate('demandas');

  if (!rutDoc) {
    return new Response(JSON.stringify({ error: 'No se encontraron datos para el RUT proporcionado' }), { status: 404 });
  }

  const demandasNuevas = rutDoc.demandas;  // En este caso, se envían todas las demandas

  await enviarNotificacion(rut, demandasNuevas);

  return new Response(JSON.stringify({ message: 'Notificación enviada' }), { status: 200 });
}
