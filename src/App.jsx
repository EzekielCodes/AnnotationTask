// import { useState } from 'react';
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import SelectImg from './components/select-image';
import Navbar from './components/header';
import Tool from './components/tool';

function App() {
  
  return (
    <div className='App'>
      <Navbar/>
      <main className='main'>
        <SelectImg/>
        <Tool/>
      </main>
    </div>
  )
}

export default App
