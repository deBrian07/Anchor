import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import './App.css'
import './Sim.css'
import App from './App.tsx'
import Sim from './Sim.tsx'

function Root() {
  const [sim, setSim] = useState(location.hash === '#sim')
  useEffect(() => {
    const onHash = () => setSim(location.hash === '#sim')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return sim ? <Sim /> : <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
