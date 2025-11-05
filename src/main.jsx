import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Main from './pages/Main.jsx'
import Result from './pages/Result.jsx'
import './styles/App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
    <Routes>
      <Route path='/' element={<Main />} />
      <Route path='/result' element={<Result />} />
    </Routes>
    </BrowserRouter>
  </StrictMode>,
)
