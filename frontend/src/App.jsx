import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR, useXR } from '@react-three/xr'
import { CATEGORIES } from './config/categories.js'
import { xrStore } from './xr/xrStore.js'
import SpatialProbe from './xr/SpatialProbe.jsx'
import MathScene3D from './scenes/MathScene3D.jsx'
import ResultPanel from './components/ResultPanel.jsx'
import { useMathWorkspace } from './hooks/useMathWorkspace.js'
import MethodForm from './components/MethodForm.jsx'
import './App.css'

const CATEGORY_LABELS = {
  closed_roots: 'Métodos cerrados / IEEE',
  open_roots: 'Métodos abiertos',
  polynomials: 'Polinomios',
  interpolation: 'Interpolación',
  calculus: 'Cálculo numérico',
  linear_systems: 'Sistemas lineales',
  ode: 'Ecuaciones diferenciales',
}

function WorkspaceScene(props) {
  const inAR = useXR((state) => state.mode === 'immersive-ar')

  if (inAR) return <SpatialProbe />

  return <MathScene3D {...props} />
}

export default function App() {
  const [xrSupported, setXrSupported] = useState(false)
  const [xrError, setXrError] = useState('')

  const {
    categoryId,
    currentCategory,
    result,
    errorMsg,
    sceneTitle,
    handleCategoryChange,
    formProps,
  } = useMathWorkspace()

  useEffect(() => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar')
        .then(setXrSupported)
        .catch(() => setXrSupported(false))
    }
  }, [])

  async function enterAR() {
    setXrError('')

    try {
      await xrStore.enterAR()
    } catch (error) {
      setXrError(error.message || 'No se pudo iniciar AR')
    }
  }

  return (
    <div className="lab-shell">
      <header className="lab-header">
        <div className="lab-brand">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path
              d="M24 3 43 14 43 34 24 45 5 34 5 14Z M5 14 24 25 43 14 M24 25V45"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <h1>NumQuest <span>3D</span></h1>
            <p>Laboratorio matemático en realidad mixta</p>
          </div>
        </div>

        <div className="lab-header-actions">
          <span className="lab-status">
            <i />
            Motor matemático
          </span>

          {xrSupported ? (
            <button className="xr-pill-btn" onClick={enterAR}>
              Probar realidad mixta
            </button>
          ) : (
            <span className="xr-status-badge">
              Vista web · 3D
            </span>
          )}
        </div>
      </header>

      <aside className="lab-nav lab-panel">
        <span className="lab-eyebrow">Biblioteca</span>
        <h2>Explorar métodos</h2>

        <nav className="lab-categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              aria-pressed={categoryId === cat.id}
              className={`lab-category ${categoryId === cat.id ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat.id)}
            >
              <span className="lab-category-icon">{cat.icon}</span>
              <span>{CATEGORY_LABELS[cat.id]}</span>
              <span className="lab-chevron">›</span>
            </button>
          ))}
        </nav>

        <div className="lab-library-info">
          <strong>33</strong>
          <span>Métodos numéricos</span>
          <small>5 unidades de aprendizaje</small>
        </div>
      </aside>

      <main className="lab-workspace">
        <section className="lab-panel lab-visualization">
          <div className="lab-stage-heading">
            <span className="lab-eyebrow">{currentCategory.unitTitle}</span>
            <div className="lab-stage-title">
              <h2>{formProps.currentMethodObj.label}</h2>
              <span className="lab-tag">Vista 3D</span>
            </div>
            <p>{sceneTitle}</p>
          </div>

          <div className="lab-canvas">
            <Canvas camera={{ position: [0, 1.5, 6.5], fov: 50 }}>
              <XR store={xrStore}>
                <WorkspaceScene
                  category={categoryId}
                  result={result}
                  titleLabel={sceneTitle}
                />
              </XR>
            </Canvas>

            {!result && (
              <div className="lab-canvas-hint">
                Introduce los parámetros y calcula para comenzar.
              </div>
            )}
          </div>

          <div className="lab-legend">
            <span>Arrastra para rotar</span>
            <span>Rueda para acercar</span>
          </div>
        </section>

        <section className="lab-panel lab-process">
          <div>
            <span className="lab-eyebrow">Procedimiento</span>
            <h3>Iteraciones y pasos</h3>
          </div>
          <strong>
            {result?.iterations?.length ??
              result?.trajectory?.length ??
              result?.steps?.length ?? 0}
          </strong>
        </section>
      </main>

      <aside className="lab-inspector lab-panel">
        <span className="lab-eyebrow">Configuración</span>
        <h2>Función y parámetros</h2>

        <MethodForm {...formProps} />

        {errorMsg && <div role="alert" className="error-banner">{errorMsg}</div>}
        {xrError && <div role="alert" className="error-banner">{xrError}</div>}

        <div className="lab-section-divider" />

        <span className="lab-eyebrow">Motor numérico</span>
        <h2>Proceso y resultado</h2>

        {!result && (
          <p className="lab-empty">Los resultados aparecerán aquí después del cálculo.</p>
        )}

        <ResultPanel result={result} />
      </aside>
    </div>
  )
}
