import { schedule } from 'node-cron';
import { buscarYGuardarDemandas } from './app/server-actions/saveDemanda.js';

schedule('* * * * *', () => {
  console.log('Hello World');
  try {
    // connectDB();
    const ruts = {rut:'17268158',dv:'1'}
    console.log("vamos a realizar el ejercicio con todos estos ruts:", ruts)
    buscarYGuardarDemandas(ruts.rut, ruts.dv);
  } catch (error) {
    console.log(error);
  }
});