import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Root element not found. Make sure <div id='root'></div> exists in index.html"
  );
}

createRoot(rootElement).render(<App />);
