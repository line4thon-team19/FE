import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Main from './pages/Main.jsx'
import Result from './pages/Result.jsx'
import './sass/Main.scss'
import { BrowserRouter, Routes, Route } from 'react-router-dom';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
    <Routes>
      <Route path='/' element={<Main />} />
      <Route path='/result/:sessionId' element={<Result />} />
    </Routes>
    </BrowserRouter>
  </StrictMode>,
)
