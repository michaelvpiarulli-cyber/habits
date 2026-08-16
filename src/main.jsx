import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/anton/400.css' // display only: streak numerals and the wordmark
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './index.css'
import App from './App.jsx'
import { DataProvider } from './context/DataProvider.jsx'
import { LifeProvider } from './context/LifeProvider.jsx'
import { GoogleProvider } from './context/GoogleProvider.jsx'
import { AuthProvider } from './hooks/useAuth.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <DataProvider>
        <LifeProvider>
          <GoogleProvider>
            <App />
          </GoogleProvider>
        </LifeProvider>
      </DataProvider>
    </AuthProvider>
  </StrictMode>,
)
