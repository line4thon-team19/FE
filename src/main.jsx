import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Main from './pages/Main.jsx'
import Result from './pages/Result.jsx'
import PracticeGame from './components/Practice.jsx';

import './sass/Main.scss'
import './sass/practice.scss'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
    <Routes>
      <Route path='/' element={<Main />} />
      <Route path='/result/battle/:sessionId' element={<Result />} />
      <Route path='/result/practice/:practiceId' element={<Result />} />
      <Route path="/practice"
          element={<PracticeGame onGoHome={() => (window.location.href = "/")} />}/>
    </Routes>
    </BrowserRouter>
  </StrictMode>,
) 
