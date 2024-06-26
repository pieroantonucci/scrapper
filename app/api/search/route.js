// app/api/search/route.js
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from 'chrome-aws-lambda';
import cortesTribunales from '../../../data/cortesTribunales.json';

const buscarCausas = async (page, rut, dv, corte, tribunal) => {
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
    await page.waitForSelector('.input-group-prepend span');
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
    await page.waitForSelector('#users-list-datatable', { timeout: 2000 });
    console.log('Resultados cargados');

    // Verificar si se encontraron resultados
    const noResults = await page.evaluate(() => {
      const resultElement = document.querySelector('#users-list-datatable tbody tr td');
      return resultElement && resultElement.innerText.includes('No se encontraron resultados');
    });

    if (noResults) {
      console.log(`No se encontraron resultados para Corte: ${corte}, Tribunal: ${tribunal}`);
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
    return data;
  } catch (error) {
    console.error(`Error en buscar Causas para Corte: ${corte}, Tribunal: ${tribunal}`, error);
    return [];
  }
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rut = searchParams.get('rut');
  const dv = searchParams.get('dv');

  console.log('Received request with RUT:', rut, 'DV:', dv);

  if (!rut || !dv) {
    console.error('Missing RUT or DV');
    return NextResponse.json({ error: 'RUT y DV son requeridos' }, { status: 400 });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    let allResults = [];

    for (const { corte, tribunal } of cortesTribunales) {
      try {
        console.log(`Searching causes for Corte: ${corte}, Tribunal: ${tribunal}`);
        const data = await buscarCausas(page, rut, dv, corte, tribunal);
        console.log(`Data obtained for Corte: ${corte}, Tribunal: ${tribunal}:`, data);
        allResults = [...allResults, ...data];
      } catch (error) {
        console.error(`Error in buscarCausas for Corte: ${corte}, Tribunal: ${tribunal}`, error);
      }
    }
    await browser.close();
    console.log('All results obtained:', allResults);

    const response = NextResponse.json(allResults, { status: 200 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  } catch (error) {
    console.error('Error while obtaining data:', error);
    if (browser) await browser.close();
    const response = NextResponse.json({ error: 'Error al obtener los datos' }, { status: 500 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }
}