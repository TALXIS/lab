import '@/utils/FabricConfig'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// No <StrictMode>: its dev-only mount/unmount/mount cycle breaks TALXIS base controls, which
// tear their state down in effect cleanups (Form destroys its record, nested controls drop their
// instance), leaving blank forms and header cells stuck loading. It changes nothing in production.
createRoot(document.getElementById('root')!).render(<App />)
