import { buscarYGuardarDemandas } from './app/server-actions/saveDemanda.js';
import Rut from './models/Rut.js';
import connectDB from './utils/db.js';

async function runCronManually() {
  try {
    console.log('Ejecutando cron manualmente...');
    await connectDB();
    const ruts = await Rut.find();
    console.log('RUTs obtenidos:', ruts);

    for (const rutDoc of ruts) {
      console.log(`Procesando RUT: ${rutDoc.rut}-${rutDoc.dv}`);
      await buscarYGuardarDemandas(rutDoc.rut, rutDoc.dv);
    }

    console.log('Cron ejecutado manualmente');
  } catch (error) {
    console.error('Error durante la ejecución manual del cron:', error);
  }
}

runCronManually();
