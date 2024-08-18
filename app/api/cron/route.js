import cron from 'node-cron';
import { buscarYGuardarDemandas } from '../server-actions/saveDemanda';
import Rut from '../models/Rut';
import connectDB from '../utils/db';

cron.schedule('40 9 * * *', async () => { // Todos los días a medianoche
  try {
    console.log('Iniciando cron job...');
    await connectDB();
    const ruts = await Rut.find();
    console.log('RUTs obtenidos:', ruts);

    for (const rutDoc of ruts) {
      console.log(`Procesando RUT: ${rutDoc.rut}-${rutDoc.dv}`);
      await buscarYGuardarDemandas(rutDoc.rut, rutDoc.dv);
    }

    console.log('Cron job executed');
  } catch (error) {
    console.error('Error durante la ejecución del cron:', error);
  }
});
