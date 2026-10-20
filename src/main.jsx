import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { DataProvider } from './context/DataProvider.jsx'
import { LifeProvider } from './context/LifeProvider.jsx'
import { PagesProvider } from './context/PagesProvider.jsx'
import { GoogleProvider } from './context/GoogleProvider.jsx'
import { AuthProvider } from './hooks/useAuth.js'
import { registerServiceWorker } from './lib/swRegister.js'

registerServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <DataProvider>
        <LifeProvider>
          <PagesProvider>
            <GoogleProvider>
              <App />
            </GoogleProvider>
          </PagesProvider>
        </LifeProvider>
      </DataProvider>
    </AuthProvider>
  </StrictMode>,
)
