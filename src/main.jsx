import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Result from './Result.jsx'
import './styles/App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
    <Routes>
      <Route path='/' element={<App />} />
      <Route path='/result' element={<Result />} />
    </Routes>
    </BrowserRouter>
  </StrictMode>,
)
