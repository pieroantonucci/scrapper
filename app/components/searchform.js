// app/components/SearchForm.js
'use client';

import { useState } from 'react';
import { ClipLoader } from 'react-spinners'

export default function SearchForm() {
  const [rut, setRut] = useState('');
  const [dv, setDv] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await fetch(`https://scrapper-tawny.vercel.app/api/search?rut=${rut}&dv=${dv}`);
      if (!response.ok) {
        throw new Error('Error al buscar las causas');
      }
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=''>
       
        <div className='flex flex-col p-20 max-w-3xl mx-auto'>
            <input className='my-1 rounded-md px-3 text-center' type="text" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="Ingrese RUT sin DV, sin puntos ni guión" />
            <input className='my-1 rounded-md px-3 text-center' type="text" value={dv} onChange={(e) => setDv(e.target.value)} placeholder="Ingrese DV" />
            <button className='bg-cyan-600 text-slate-800 font-bold mx-auto my-3 px-24 rounded-xl' onClick={handleSearch}>Buscar</button>
        </div>
      {loading && (
        <div className='flex flex-col items-center mb-10'>
          <ClipLoader color="#3699d6" loading={loading} size={50} />
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {results && (
        <div className='min-w-full'>
        <table className='mt-8 mx-auto'>
          <thead>
            <tr className='border border-collapse'>
              <th className='px-2'>RIT</th>
              <th className='px-2'>Nombre</th>
              <th className='px-2'>Caratulado</th>
              <th className='px-2'>Competencia</th>
              <th className='px-2'>Tribunal</th>
              <th className='px-2'>Corte</th>
              <th className='px-2'>Fecha Ingreso Causa</th>
            </tr>
          </thead>
          <tbody>

          {results.map((result, index) => (
            <tr className='text-center' key={index}>
              <td className='px-2'>{result.rit}</td>
              <td className='px-2'>{result.nombre}</td>
              <td className='px-2'>{result.caratulado}</td>
              <td className='px-2'>{result.competencia}</td>
              <td className='px-2'>{result.tribunal}</td>
              <td className='px-2'>{result.corte}</td>
              <td className='px-2'>{result.fecha_ing_causa}</td>
            </tr>
          ))}
          </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
