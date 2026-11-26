import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR } from '@react-three/xr'
import { CATEGORIES } from './config/categories.js'
import { xrStore } from './xr/xrStore.js'
import MathScene3D from './scenes/MathScene3D.jsx'
import ResultPanel from './components/ResultPanel.jsx'
import { useMathWorkspace } from './hooks/useMathWorkspace.js'
import MethodForm from './components/MethodForm.jsx'
import './App.css'

// ==========================================
// APLICACIÓN PRINCIPAL
// ==========================================
export default function App() {
  const [xrSupported, setXrSupported] = useState(false)
  const {
    categoryId,
    currentCategory,
    result,
    errorMsg,
    sceneTitle,
    handleCategoryChange,
    formProps,
  } = useMathWorkspace()

  // Detectar soporte real de WebXR (solo muestra botón AR en Quest 3 / visores XR)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.xr) {
      navigator.xr
        .isSessionSupported('immersive-ar')
        .then((supported) => setXrSupported(supported))
        .catch(() => setXrSupported(false))
    }
  }, [])

  return (
    <div className="app-shell">
      {/* PANEL LATERAL SPATIAL GLASS */}
      <aside className="spatial-sidebar">
        <div className="brand-header">
          <div>
            <h1 className="brand-title">NumQuest 3D</h1>
            <p className="brand-subtitle">{currentCategory.unitTitle}</p>
          </div>

          {xrSupported ? (
            <button type="button" className="xr-pill-btn" onClick={() => xrStore.enterAR()}>
              🥽 Passthrough AR
            </button>
          ) : (
            <span className="xr-status-badge">🖥️ Vista 3D Web</span>
          )}
        </div>

        {/* SELECTOR DE 7 CATEGORÍAS */}
        <div className="category-grid">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`cat-chip ${categoryId === cat.id ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat.id)}
            >
              <span className="cat-icon">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* FORMULARIO DINÁMICO */}
        <MethodForm {...formProps} />

        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        <ResultPanel result={result} />
      </aside>

      {/* ESCENARIO 3D / WEBXR */}
      <main className="canvas-stage">
        <div className="hud-overlay">
          Arrastra para rotar · Rueda para zoom · <strong>{currentCategory.label}</strong>
        </div>
        <Canvas camera={{ position: [0, 1.5, 6.5], fov: 50 }}>
          <XR store={xrStore}>
            <MathScene3D
              category={categoryId}
              result={result}
              titleLabel={sceneTitle}
            />
          </XR>
        </Canvas>
      </main>
    </div>
  )
}
