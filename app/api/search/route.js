import { buscarYGuardarDemandas, buscarYGuardarDemandas2 } from '../../server-actions/saveDemanda';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rut = searchParams.get('rut');
  const dv = searchParams.get('dv');

  if (!rut || !dv) {
    return new Response(JSON.stringify({ error: 'RUT y DV son requeridos' }), { status: 400 });
  }

  const demandasNuevas = await buscarYGuardarDemandas(rut, dv);

  return new Response(JSON.stringify(demandasNuevas), { status: 200 });
}
