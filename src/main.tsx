import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GlobalNetworkErrorProvider } from './providers/GlobalNetworkErrorProvider/GlobalNetworkErrorProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalNetworkErrorProvider>
      <App />
    </GlobalNetworkErrorProvider>
  </StrictMode>,
)
