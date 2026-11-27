import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR, useXR } from '@react-three/xr'
import { CATEGORIES } from './config/categories.js'
import { xrStore } from './xr/xrStore.js'
import SpatialLab from './xr/SpatialLab.jsx'
import ImmersiveLab from './immersive/ImmersiveLab.jsx'
import { LinearScene, LinearAR } from './immersive/LinearWorld.jsx'
import { useIterationPlayer } from './hooks/useIterationPlayer.js'
import MathScene3D from './scenes/MathScene3D.jsx'
import ResultPanel from './components/ResultPanel.jsx'
import { useMathWorkspace } from './hooks/useMathWorkspace.js'
import MethodForm from './components/MethodForm.jsx'
import NewtonScene from './scenes/NewtonPlot.jsx'
import IterationControls from './components/IterationControls.jsx'
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

const SUPPORTED_PLOT_KINDS = [
  'newton',
  'bisection',
  'secant',
  'lagrange',
  'neville',
  'trapezoid',
  'simpson_1_3',
  'simpson_3_8',
  'linear_system',
  'ode',
]

function WorkspaceScene(props) {
  const mode = useXR(state => state.mode)
  const inAR = mode === 'immersive-ar'
  const inVR = mode === 'immersive-vr'
  const supportedPlot = SUPPORTED_PLOT_KINDS.includes(props.result?.plot?.kind)
    ? props.result.plot
    : null

  if (inVR || (!inAR && props.immersivePreview)) {
    return (
      <ImmersiveLab
        methodLabel={props.methodLabel}
        formState={props.formState}
        plot={supportedPlot}
        step={props.step}
        playing={props.playing}
        onSeek={props.onSeek}
        onToggle={props.onToggle}
        onLoadExample={props.onLoadExample}
        loading={props.loading}
        errorMsg={props.errorMsg}
        immersive={inVR}
      />
    )
  }

  if (supportedPlot?.kind === 'linear_system') {
    if (inAR) {
      return <LinearAR {...props} plot={supportedPlot} />
    }

    return <LinearScene plot={supportedPlot} step={props.step} />
  }

  if (inAR) {
    return (
      <SpatialLab
        plot={supportedPlot}
        step={props.step}
        playing={props.playing}
        onSeek={props.onSeek}
        onToggle={props.onToggle}
        onLoadExample={props.onLoadExample}
        loading={props.loading}
        errorMsg={props.errorMsg}
      />
    )
  }

  if (supportedPlot) {
    return (
      <NewtonScene
        plot={supportedPlot}
        step={props.step}
      />
    )
  }

  return <MathScene3D {...props} />
}

export default function App() {
  const [xrSupported, setXrSupported] = useState(false)
  const [xrError, setXrError] = useState('')
  const [vrSupported, setVrSupported] = useState(false)
  const [immersivePreview, setImmersivePreview] = useState(false)

  const {
    categoryId,
    currentCategory,
    result,
    errorMsg,
    sceneTitle,
    handleCategoryChange,
    loadMathExample,
    formProps,
  } = useMathWorkspace()

  const plot = SUPPORTED_PLOT_KINDS.includes(result?.plot?.kind)
    ? result.plot
    : null

  const { step, playing, seek, toggle } = useIterationPlayer(plot)

  const displayedTitle = plot
    ? (plot.title ?? `f(x) = ${plot.expression}`)
    : sceneTitle

  useEffect(() => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr')
        .then(setVrSupported)
        .catch(() => setVrSupported(false))

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

          <button
            className="xr-pill-btn"
            onClick={() => setImmersivePreview(v => !v)}
          >
            {immersivePreview ? 'Vista académica' : 'Explorar XYZ'}
          </button>

          {vrSupported && (
            <button
              className="xr-pill-btn"
              onClick={async () => {
                setXrError('')
                try {
                  await xrStore.enterVR()
                } catch (error) {
                  setXrError(error.message || 'No se pudo iniciar VR')
                }
              }}
            >
              Entrar en VR
            </button>
          )}

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
              <span className="lab-tag">
                {immersivePreview
                  ? 'Entorno XYZ'
                  : plot?.kind === 'linear_system'
                    ? 'Vista XYZ'
                    : plot ? 'Vista 2D' : 'Vista 3D'}
              </span>
            </div>
            <p>{displayedTitle}</p>
          </div>

          <div className="lab-canvas">
            <Canvas camera={{ position: [0, 1.5, 6.5], fov: 50 }}>
              <XR store={xrStore}>
                <WorkspaceScene
                  immersivePreview={immersivePreview}
                  methodLabel={formProps.currentMethodObj.label}
                  formState={formProps}
                  category={categoryId}
                  result={result}
                  titleLabel={displayedTitle}
                  step={step}
                  playing={playing}
                  onSeek={seek}
                  onToggle={toggle}
                  onLoadExample={loadMathExample}
                  loading={formProps.loading}
                  errorMsg={errorMsg}
                />
              </XR>
            </Canvas>

            {!result && !immersivePreview && (
              <div className="lab-canvas-hint">
                Introduce los parámetros y calcula para comenzar.
              </div>
            )}
          </div>

          <div className="lab-legend">
            <span>
              {immersivePreview
                ? 'Arrastra para explorar XYZ'
                : plot?.kind === 'linear_system'
                  ? 'Arrastra para explorar XYZ'
                  : plot ? 'Plano cartesiano frontal' : 'Arrastra para rotar'}
            </span>
            <span>Rueda para acercar</span>
            {immersivePreview && (
              <span>Clic derecho para desplazar</span>
            )}
          </div>
        </section>

        {plot ? (
          <IterationControls
            plot={plot}
            step={step}
            onChange={seek}
            playing={playing}
            onToggle={toggle}
          />
        ) : (
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
        )}
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
