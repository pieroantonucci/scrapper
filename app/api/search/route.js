// app/api/search/route.js
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import cortesTribunales from '../../../data/cortesTribunales.json';
import pLimit from 'p-limit';
import cortesTribunalesPrueba from '../../../data/cortesTribunalesPrueba.json';

const limit = pLimit(5); // Puedes ajustar el límite según tu capacidad de hardware

const buscarCausas = async ( rut, dv, corte, tribunal) => {
 
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://reca.pjud.cl/NRECA/MenuForwardAction.do?method=cargaBusquedaPorRut', {
      waitUntil: 'networkidle2'
    });

    // Seleccionar "CIVIL" en el campo "COMPETENCIA"
    await page.waitForSelector('select[name="RUT_Cod_Competencia"]');
    await page.select('select[name="RUT_Cod_Competencia"]', 'C');
    console.log('Seleccionado competencia: CIVIL');

    // Ingresar el RUT y el dígito verificador
    await page.type('input[name="RUT_Rut"]', rut);
    await page.type('input[name="RUT_Rut_Db"]', dv);
    console.log(`Ingresado RUT: ${rut}-${dv}`);

    // Seleccionar la CORTE y TRIBUNAL
    await page.waitForSelector('select[name="OPC_Cod_Corte"]');
    await page.select('select[name="OPC_Cod_Corte"]', corte);
    console.log(`Seleccionado corte: ${corte}`);

    await page.waitForSelector('select[name="OPC_Cod_Tribunal"]');
    await page.select('select[name="OPC_Cod_Tribunal"]', tribunal);
    console.log(`Seleccionado tribunal: ${tribunal}`);

    // Obtener el captcha
    const captchaText = await page.evaluate(() => {
      return document.querySelector('.input-group-prepend span').innerText.trim();
    });
    console.log(`Captcha obtenido: ${captchaText}`);

    // Ingresar el captcha
    await page.type('input[name="txtCaptcha"]', captchaText);

    // Presionar el botón "BUSCA CAUSAS"
    await page.click('button[onclick="verificarCaptchaTrib()"]');
    console.log('Botón de búsqueda presionado');

    // Esperar a que los resultados se carguen
    await page.waitForSelector('#users-list-datatable', { timeout: 60000 }); // Aumenta el tiempo de espera
    console.log('Resultados cargados');

    // Verificar si se encontraron resultados
    const noResults = await page.evaluate(() => {
      const resultElement = document.querySelector('#users-list-datatable tbody tr td');
      return resultElement && resultElement.innerText.includes('No se encontraron resultados');
    });

    if (noResults) {
      console.log(`No se encontraron resultados para Corte: ${corte}, Tribunal: ${tribunal}`);
      await browser.close();
      return [];
    }

    // Extraer los resultados
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

    console.log(`Datos extraídos para Corte: ${corte}, Tribunal: ${tribunal}:`, data);
    await browser.close();
    return data;
  } catch (error) {
    console.error(`Error en buscar Causas para Corte: ${corte}, Tribunal: ${tribunal}`, error);
    await browser.close();
    return [];
  }
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rut = searchParams.get('rut');
  const dv = searchParams.get('dv');

  if (!rut || !dv) {
    return NextResponse.json({ error: 'RUT y DV son requeridos' }, { status: 400 });
  }

  try {
    const promises = cortesTribunales.map(({ corte, tribunal }) =>
      limit(() => buscarCausas(rut, dv, corte, tribunal))
    );

    const results = await Promise.all(promises);

    const allResults = results.flat();

    return NextResponse.json(allResults, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener los datos' }, { status: 500 });
  }
}