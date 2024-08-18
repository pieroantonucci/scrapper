'use client'
import React from 'react'
import { Pepe } from '../server-actions/searchProcess';

const page = () => {

    const handleSearchProcess = async () => {
        console.log('Search process started');
        const Pepazo = await Pepe();
    }

  return (
    <div>
        <button className='bg-cyan-600 text-slate-800 font-bold mx-auto my-3 px-24 rounded-xl' onClick={() => handleSearchProcess()}>Buscar</button>
    </div>
  )
}

export default page