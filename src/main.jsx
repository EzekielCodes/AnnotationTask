import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import ImgContextProvider from './context/img-context.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ImgContextProvider>
      <App />
    </ImgContextProvider>
  </React.StrictMode>
)
