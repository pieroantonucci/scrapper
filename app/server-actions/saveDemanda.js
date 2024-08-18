import puppeteer from 'puppeteer';
import connectDB from '../../utils/db';
import Demanda from '../../models/Demanda';
import Rut from '../../models/Rut';
import cortesTribunales from '../../data/cortesTribunales.json';
import { enviarNotificacion } from '@/utils/email';
import { Sema } from 'async-sema';

const buscarCausas = async (page, rut, dv, corte, tribunal) => {
  try {
    await page.goto('https://reca.pjud.cl/NRECA/MenuForwardAction.do?method=cargaBusquedaPorRut', {
      waitUntil: 'networkidle2'
    });

    await page.waitForSelector('select[name="RUT_Cod_Competencia"]');
    await page.select('select[name="RUT_Cod_Competencia"]', 'C');

    await page.type('input[name="RUT_Rut"]', rut);
    await page.type('input[name="RUT_Rut_Db"]', dv);

    await page.waitForSelector('select[name="OPC_Cod_Corte"]');
    await page.select('select[name="OPC_Cod_Corte"]', corte);

    await page.waitForSelector('select[name="OPC_Cod_Tribunal"]');
    await page.select('select[name="OPC_Cod_Tribunal"]', tribunal);

    await page.waitForSelector('.input-group-prepend span');
    const captchaText = await page.evaluate(() => {
      return document.querySelector('.input-group-prepend span').innerText.trim();
    });

    await page.type('input[name="txtCaptcha"]', captchaText);
    await page.click('button[onclick="verificarCaptchaTrib()"]');

    await page.waitForSelector('#users-list-datatable', { timeout: 2000 });

    const noResults = await page.evaluate(() => {
      const resultElement = document.querySelector('#users-list-datatable tbody tr td');
      return resultElement && resultElement.innerText.includes('No se encontraron resultados');
    });

    if (noResults) {
      return [];
    }

    const data = await page.evaluate(() => {
      const rows = document.querySelectorAll('#users-list-datatable tbody tr');
      return Array.from(rows).map(row => {
        const columns = row.querySelectorAll('td');
        return {
          cupon_de_pago: columns[0].innerText,
          rit: columns[1].innerText,
          nombre: columns[2].innerText,
          caratulado: columns[3].innerText,
          competencia: columns[4].innerText,
          tribunal: columns[5].innerText,
          corte: columns[6].innerText,
          fecha_ing_causa: columns[7].innerText
        };
      });
    });

    return data;
  } catch (error) {
    console.error(`Error en buscar Causas para Corte: ${corte}, Tribunal: ${tribunal}`, error);
    return [];
  }
};

const limit = new Sema(1);

export async function buscarYGuardarDemandas(rut, dv) {
    await connectDB();
  
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage();
  
    let rutDoc = await Rut.findOne({ rut });
    if (!rutDoc) {
      rutDoc = new Rut({ rut, dv, nombre: '', demandas: [] });
      await rutDoc.save();  // Solo guardamos si es un nuevo RUT
    }
  
    const demandasExistentes = new Set(rutDoc.demandas.map(demanda => demanda.toString()));
    let demandasNuevas = [];
    let allResults = [];
  
    for (const { corte, tribunal } of cortesTribunales) {
      const data = await buscarCausas(page, rut, dv, corte, tribunal);
      allResults = [...allResults, ...data];
  
      for (const demanda of data) {
        const idUnico = `${rut}-${demanda.rit}-${demanda.tribunal}`;
        const existe = await Demanda.findOne({ idUnico });
  
        if (!existe) {
          const nuevaDemanda = new Demanda({
            rol: demanda.rit,
            tribunal: demanda.tribunal,
            detalles: demanda,
            idUnico,
          });
          await nuevaDemanda.save();
          rutDoc.demandas.push(nuevaDemanda._id);
          demandasNuevas.push(nuevaDemanda);
        }
      }
    }
  
    // Solo actualizamos rutDoc si hemos agregado nuevas demandas
    if (demandasNuevas.length > 0) {
      await rutDoc.save();
    }
  
    await browser.close();
  
    if (demandasNuevas.length > 0) {
      await enviarNotificacion(rut, demandasNuevas);
    } else if (demandasExistentes.size > 0) {
      console.log(`No hay demandas nuevas para el RUT: ${rut}`);
    } else {
      await enviarNotificacion(rut, allResults); // Primera vez, notificar todas las demandas
    }
  
    return allResults;
  }
  
export async function buscarYGuardarDemandas2(rut, dv) {
    await connectDB();
  
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage();
  
    let rutDoc = await Rut.findOne({ rut });
    if (!rutDoc) {
      rutDoc = new Rut({ rut, dv, nombre: '', demandas: [] });
      await rutDoc.save();
    }
  
    const demandasExistentes = new Set(rutDoc.demandas.map(demanda => demanda.toString()));
    let demandasNuevas = [];
  
    const promises = cortesTribunales.map(({ corte, tribunal }) =>
      limit.acquire().then(async () => {
        const data = await buscarCausas(page, rut, dv, corte, tribunal);
  
        for (const demanda of data) {
          const idUnico = `${rut}-${demanda.rit}-${demanda.tribunal}`;
          const existe = await Demanda.findOne({ idUnico });
  
          if (!existe) {
            const nuevaDemanda = new Demanda({
              rol: demanda.rit,
              tribunal: demanda.tribunal,
              detalles: demanda,
              idUnico,
            });
            await nuevaDemanda.save();
            rutDoc.demandas.push(nuevaDemanda._id);
            demandasNuevas.push(nuevaDemanda);
          }
        }
  
        limit.release();
      })
    );
  
    await Promise.all(promises);
    await rutDoc.save();
    await browser.close();
  
    if (demandasNuevas.length > 0) {
      await enviarNotificacion(rut, demandasNuevas);
    } else if (demandasExistentes.size > 0) {
      console.log(`No hay demandas nuevas para el RUT: ${rut}`);
    } else {
      await enviarNotificacion(rut, rutDoc.demandas); // Primera vez, notificar todas las demandas
    }
  
    return rutDoc.demandas;
  }
  
  