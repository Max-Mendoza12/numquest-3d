import { useState, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Line, Text, Grid } from '@react-three/drei'
import { XR, createXRStore } from '@react-three/xr'
import * as THREE from 'three'
import './App.css'

const xrStore = createXRStore({
  hand: true,
  controller: true,
})

// ==========================================
// CATÁLOGO DE LAS 7 CATEGORÍAS Y 33 MÉTODOS
// ==========================================
const CATEGORIES = [
  {
    id: 'closed_roots',
    label: 'Cerrados',
    icon: '📐',
    unitTitle: 'Unidad 1 · Punto Flotante y Métodos Cerrados',
    methods: [
      { id: 'float_ieee', label: 'IEEE 754 (32/64 bits)', tag: 'Binario' },
      { id: 'bisection', label: 'Bisección', tag: 'Lineal' },
      { id: 'false_position', label: 'Falsa Posición (Regula Falsi)', tag: 'Superlineal' },
    ],
  },
  {
    id: 'open_roots',
    label: 'Abiertos',
    icon: '🎯',
    unitTitle: 'Unidad 1 · Métodos Abiertos y Raíces Múltiples',
    methods: [
      { id: 'fixed_point', label: 'Punto Fijo g(x)', tag: 'Iterativo' },
      { id: 'newton', label: 'Newton-Raphson', tag: 'Cuadrático' },
      { id: 'newton_multiple', label: 'Newton Raíces Múltiples', tag: 'Multiplicidad' },
      { id: 'secant', label: 'Secante', tag: 'Orden 1.618' },
      { id: 'steffensen', label: 'Steffensen', tag: 'Sin derivadas' },
      { id: 'muller', label: 'Müller (Raíces Complejas)', tag: 'Parabólico' },
    ],
  },
  {
    id: 'polynomials',
    label: 'Polinomios',
    icon: '🧮',
    unitTitle: 'Unidad 2 · Polinomios y Aceleración',
    methods: [
      { id: 'horner', label: 'Método de Horner', tag: 'Div. Sintética' },
      { id: 'newton_horner', label: 'Newton-Horner', tag: 'Raíz Real' },
      { id: 'deflation', label: 'Deflación Polinomial', tag: 'Todas las raíces' },
      { id: 'aitken', label: 'Aceleración Aitken Δ²', tag: 'Sucesiones' },
      { id: 'bairstow', label: 'Método de Bairstow', tag: 'Factor Cuadrático' },
    ],
  },
  {
    id: 'interpolation',
    label: 'Interpolación',
    icon: '📈',
    unitTitle: 'Unidad 3 · Interpolación y Aproximación',
    methods: [
      { id: 'vandermonde', label: 'Matriz de Vandermonde', tag: 'Sistema Lineal' },
      { id: 'lagrange', label: 'Polinomio de Lagrange', tag: 'Bases L_i(x)' },
      { id: 'neville', label: 'Método de Neville', tag: 'Recursivo' },
      { id: 'divided_differences', label: 'Diferencias Divididas (Newton)', tag: 'Progresivo' },
      { id: 'hermite', label: 'Interpolación de Hermite', tag: 'Con derivadas' },
      { id: 'cubic_spline', label: 'Splines Cúbicos (Natural / Sujeto)', tag: 'Trazadores' },
    ],
  },
  {
    id: 'calculus',
    label: 'Cálculo',
    icon: '∫',
    unitTitle: 'Unidad 4 · Derivación e Integración Numérica',
    methods: [
      { id: 'diff', label: 'Derivación Numérica (2, 3 y 5 pts)', tag: 'Diferencias' },
      { id: 'richardson', label: 'Extrapolación de Richardson', tag: 'Orden Superior' },
      { id: 'trapezoid', label: 'Regla del Trapecio Compuesta', tag: 'O(h²)' },
      { id: 'simpson_1_3', label: 'Regla de Simpson 1/3', tag: 'O(h⁴) · n par' },
      { id: 'simpson_3_8', label: 'Regla de Simpson 3/8', tag: 'O(h⁴) · n=3k' },
      { id: 'romberg', label: 'Integración de Romberg', tag: 'Tabla Triangular' },
      { id: 'adaptive', label: 'Cuadratura Adaptativa', tag: 'Recursiva' },
      { id: 'gaussian', label: 'Cuadratura Gauss-Legendre', tag: '2 a 5 nodos' },
    ],
  },
  {
    id: 'linear_systems',
    label: 'Sistemas',
    icon: '🧊',
    unitTitle: 'Unidad 5 · Sistemas de Ecuaciones Lineales',
    methods: [
      { id: 'gauss_trivial', label: 'Eliminación Gaussiana (Trivial)', tag: 'Sin pivoteo' },
      { id: 'gauss_partial', label: 'Eliminación Gaussiana (Pivoteo Parcial)', tag: 'Estable' },
      { id: 'gauss_scaled', label: 'Eliminación Gaussiana (Pivoteo Escalado)', tag: 'Alta precisión' },
    ],
  },
  {
    id: 'ode',
    label: 'EDO',
    icon: '🌊',
    unitTitle: 'Unidad 5 · Ecuaciones Diferenciales Ordinarias',
    methods: [
      { id: 'euler', label: 'Método de Euler', tag: 'Orden 1' },
      { id: 'taylor2', label: 'Taylor de Orden 2 (Simbólico)', tag: 'Orden 2' },
      { id: 'modified_euler', label: 'Euler Modificado (Heun)', tag: 'Predictor-Corrector' },
      { id: 'midpoint', label: 'Método del Punto Medio', tag: 'Orden 2' },
      { id: 'rk4', label: 'Runge-Kutta de Orden 4 (RK4)', tag: 'Estándar Oro' },
    ],
  },
]

// ==========================================
// ESCENA 3D MULTI-MODO (PC + META QUEST 3)
// ==========================================
function MathScene3D({ category, method, result, titleLabel }) {
  // Puntos para raíces / iteraciones
  const iterPoints = useMemo(() => {
    if (!result?.iterations?.length) return []
    return result.iterations.map((it, idx) => {
      const xVal = it.root_approx ?? it.x_real ?? it.r ?? 0
      const yVal = it.fx ?? it.x_imag ?? it.s ?? 0
      const zDepth = (idx - result.iterations.length / 2) * 0.16
      return {
        pos: [
          THREE.MathUtils.clamp(xVal, -6, 6),
          THREE.MathUtils.clamp(yVal, -4, 4),
          zDepth,
        ],
        label: `#${it.iter}: ${Number(xVal).toFixed(4)}`,
      }
    })
  }, [result])

  // Curva suave para interpolación
  const curveCoords = useMemo(() => {
    if (!result?.curve_points?.length) return []
    return result.curve_points.map((pt) => [
      THREE.MathUtils.clamp(pt.x, -6, 6),
      THREE.MathUtils.clamp(pt.y, -4, 4),
      0,
    ])
  }, [result])

  // Nodos de integración o derivación
  const calcNodes = useMemo(() => {
    const raw = result?.nodes || result?.evaluated_nodes || result?.gauss_nodes || []
    return raw.map((n) => ({
      x: THREE.MathUtils.clamp(n.x ?? n.x_mapped ?? 0, -6, 6),
      y: THREE.MathUtils.clamp(n.y ?? n.fx ?? 0, -4, 4),
    }))
  }, [result])

  // Trayectoria EDO (t, y)
  const odeCoords = useMemo(() => {
    if (!result?.trajectory?.length) return []
    return result.trajectory.map((pt) => [
      THREE.MathUtils.clamp(pt.t, -6, 6),
      THREE.MathUtils.clamp(pt.y, -4, 4),
      0,
    ])
  }, [result])

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[6, 10, 6]} intensity={1.3} />
      <OrbitControls makeDefault />

      <Grid
        position={[0, -2.2, 0]}
        args={[16, 16]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#1e293b"
        sectionSize={2}
        sectionThickness={1.2}
        sectionColor="#38bdf8"
        fadeDistance={20}
      />

      {/* Ejes cartesianos 3D */}
      <Line points={[[-6.5, 0, 0], [6.5, 0, 0]]} color="#64748b" lineWidth={1.5} />
      <Line points={[[0, -4.5, 0], [0, 4.5, 0]]} color="#64748b" lineWidth={1.5} />

      <Text position={[0, 3.4, -0.5]} fontSize={0.24} color="#38bdf8" maxWidth={10}>
        {titleLabel}
      </Text>

      {/* 1. VISUALIZACIÓN DE RAÍCES Y POLINOMIOS */}
      {iterPoints.length > 0 && (
        <>
          {iterPoints.length > 1 && (
            <Line points={iterPoints.map((p) => p.pos)} color="#f59e0b" lineWidth={2.5} />
          )}
          {iterPoints.map((pt, idx) => {
            const isLast = idx === iterPoints.length - 1
            return (
              <group key={idx} position={pt.pos}>
                <mesh>
                  <sphereGeometry args={[isLast ? 0.15 : 0.08, 24, 24]} />
                  <meshStandardMaterial
                    color={isLast ? '#10b981' : '#f59e0b'}
                    emissive={isLast ? '#059669' : '#d97706'}
                    emissiveIntensity={0.65}
                  />
                </mesh>
                {(isLast || idx === 0 || iterPoints.length <= 8) && (
                  <Text position={[0, 0.24, 0]} fontSize={0.13} color={isLast ? '#34d399' : '#e2e8f0'}>
                    {pt.label}
                  </Text>
                )}
              </group>
            )
          })}
        </>
      )}

      {/* 2. VISUALIZACIÓN DE INTERPOLACIÓN */}
      {curveCoords.length > 1 && (
        <>
          <Line points={curveCoords} color="#38bdf8" lineWidth={3} />
          {result?.y_eval !== undefined && (
            <group
              position={[
                THREE.MathUtils.clamp(result.x_eval, -6, 6),
                THREE.MathUtils.clamp(result.y_eval, -4, 4),
                0.05,
              ]}
            >
              <mesh>
                <sphereGeometry args={[0.16, 24, 24]} />
                <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.8} />
              </mesh>
              <Text position={[0, 0.28, 0]} fontSize={0.16} color="#34d399">
                {`P(${result.x_eval}) = ${Number(result.y_eval).toFixed(4)}`}
              </Text>
            </group>
          )}
        </>
      )}

      {/* 3. VISUALIZACIÓN DE INTEGRACIÓN / DERIVACIÓN */}
      {calcNodes.length > 0 && (
        <>
          {calcNodes.length > 1 && (
            <Line points={calcNodes.map((n) => [n.x, n.y, 0])} color="#818cf8" lineWidth={3} />
          )}
          {calcNodes.map((n, i) => (
            <group key={i}>
              <Line points={[[n.x, 0, 0], [n.x, n.y, 0]]} color="#38bdf8" lineWidth={1.5} />
              <mesh position={[n.x, n.y, 0]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.7} />
              </mesh>
            </group>
          ))}
        </>
      )}

      {/* 4. VISUALIZACIÓN DE TRAYECTORIA EDO */}
      {odeCoords.length > 1 && (
        <>
          <Line points={odeCoords} color="#10b981" lineWidth={3} />
          {odeCoords.map((pos, idx) => (
            <mesh key={idx} position={pos}>
              <sphereGeometry args={[idx === odeCoords.length - 1 ? 0.14 : 0.06, 16, 16]} />
              <meshStandardMaterial
                color={idx === odeCoords.length - 1 ? '#38bdf8' : '#10b981'}
                emissive="#059669"
                emissiveIntensity={0.6}
              />
            </mesh>
          ))}
        </>
      )}

      {/* 5. VISUALIZACIÓN DE VECTOR SOLUCIÓN EN SISTEMAS LINEALES */}
      {category === 'linear_systems' && result?.solution && (
        <group position={[0, 0.5, 0]}>
          {result.solution.map((val, idx) => (
            <group key={idx} position={[(idx - (result.solution.length - 1) / 2) * 1.4, 0, 0]}>
              <mesh position={[0, THREE.MathUtils.clamp(val / 2, -2, 2), 0]}>
                <boxGeometry args={[0.6, Math.max(0.2, Math.min(4, Math.abs(val))), 0.6]} />
                <meshStandardMaterial color="#818cf8" emissive="#4f46e5" emissiveIntensity={0.45} />
              </mesh>
              <Text position={[0, -1.6, 0]} fontSize={0.18} color="#e2e8f0">
                {`x${idx + 1} = ${val}`}
              </Text>
            </group>
          ))}
        </group>
      )}
    </>
  )
}

// ==========================================
// APLICACIÓN PRINCIPAL
// ==========================================
export default function App() {
  const [xrSupported, setXrSupported] = useState(false)
  const [categoryId, setCategoryId] = useState('open_roots')
  const [method, setMethod] = useState('newton')

  // Estados de entradas para los 33 métodos
  const [floatNum, setFloatNum] = useState(-13.625)
  const [expression, setExpression] = useState('x^3 - 2*x - 5')
  const [a, setA] = useState(1)
  const [b, setB] = useState(3)
  const [x0, setX0] = useState(2)
  const [x1, setX1] = useState(2.5)
  const [x2, setX2] = useState(3)
  const [tol, setTol] = useState(0.0001)

  // Polinomios
  const [coeffsStr, setCoeffsStr] = useState('1, -6, 11, -6')
  const [bairstowR, setBairstowR] = useState(-1)
  const [bairstowS, setBairstowS] = useState(-1)

  // Interpolación
  const [xPtsStr, setXPtsStr] = useState('0, 1, 2, 3')
  const [yPtsStr, setYPtsStr] = useState('1, 2.718, 7.389, 20.085')
  const [dyPtsStr, setDyPtsStr] = useState('1, 2.718, 7.389, 20.085')
  const [xEval, setXEval] = useState(1.5)
  const [splineType, setSplineType] = useState('natural')
  const [fp0, setFp0] = useState(1)
  const [fpn, setFpn] = useState(20.085)

  // Cálculo
  const [hStep, setHStep] = useState(0.01)
  const [calcPoints, setCalcPoints] = useState(3)
  const [diffFormula, setDiffFormula] = useState('centered')
  const [nIntervals, setNIntervals] = useState(12)
  const [levels, setLevels] = useState(4)

  // Sistemas Lineales
  const [matrixStr, setMatrixStr] = useState('3, -0.1, -0.2\n0.1, 7, -0.3\n0.3, -0.2, 10')
  const [vectorBStr, setVectorBStr] = useState('7.85, -19.3, 71.4')

  // EDO
  const [odeExpr, setOdeExpr] = useState('y - t^2 + 1')
  const [t0, setT0] = useState(0)
  const [y0, setY0] = useState(0.5)
  const [tf, setTf] = useState(2)
  const [nSteps, setNSteps] = useState(15)

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Detectar soporte real de WebXR (solo muestra botón AR en Quest 3 / visores XR)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.xr) {
      navigator.xr
        .isSessionSupported('immersive-ar')
        .then((supported) => setXrSupported(supported))
        .catch(() => setXrSupported(false))
    }
  }, [])

  const currentCategory = useMemo(
    () => CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[0],
    [categoryId]
  )

  const currentMethodObj = useMemo(
    () => currentCategory.methods.find((m) => m.id === method) || currentCategory.methods[0],
    [currentCategory, method]
  )

  const handleCategoryChange = (newCatId) => {
    setCategoryId(newCatId)
    const cat = CATEGORIES.find((c) => c.id === newCatId)
    if (cat && cat.methods.length > 0) {
      setMethod(cat.methods[0].id)
    }
    setResult(null)
    setErrorMsg('')
  }

  const parseNumberList = (str) =>
    str
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n))

  const handleCalculate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      let url = ''
      let options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }

      if (method === 'float_ieee') {
        url = `/api/unit1/float/${Number(floatNum)}`
        options = { method: 'GET' }
      } else if (categoryId === 'closed_roots' || categoryId === 'open_roots') {
        url = '/api/unit1/roots'
        options.body = JSON.stringify({
          method,
          expression,
          a: Number(a),
          b: Number(b),
          x0: Number(x0),
          x1: Number(x1),
          x2: Number(x2),
          tol: Number(tol),
          max_iter: 60,
        })
      } else if (categoryId === 'polynomials') {
        url = '/api/unit2/polynomials'
        options.body = JSON.stringify({
          method,
          coeffs: parseNumberList(coeffsStr),
          expression,
          x0: Number(x0),
          r: Number(bairstowR),
          s: Number(bairstowS),
          tol: Number(tol),
          max_iter: 60,
        })
      } else if (categoryId === 'interpolation') {
        url = '/api/unit3/interpolation'
        options.body = JSON.stringify({
          method,
          x_pts: parseNumberList(xPtsStr),
          y_pts: parseNumberList(yPtsStr),
          dy_pts: parseNumberList(dyPtsStr),
          x_eval: Number(xEval),
          boundary_type: splineType,
          fp0: Number(fp0),
          fpn: Number(fpn),
        })
      } else if (categoryId === 'calculus') {
        url = '/api/unit4/calculus'
        options.body = JSON.stringify({
          method,
          expression,
          x0: Number(x0),
          h: Number(hStep),
          points: Number(calcPoints),
          formula: diffFormula,
          levels: Number(levels),
          a: Number(a),
          b: Number(b),
          n: Number(nIntervals),
          tol: Number(tol),
        })
      } else if (categoryId === 'linear_systems') {
        url = '/api/unit5/linear-system'
        const pivotingMap = {
          gauss_trivial: 'trivial',
          gauss_partial: 'partial',
          gauss_scaled: 'scaled',
        }
        const rows = matrixStr
          .trim()
          .split('\n')
          .map((row) => parseNumberList(row))
        options.body = JSON.stringify({
          A: rows,
          b: parseNumberList(vectorBStr),
          pivoting: pivotingMap[method] || 'partial',
        })
      } else if (categoryId === 'ode') {
        url = '/api/unit5/ode'
        options.body = JSON.stringify({
          method,
          expression: odeExpr,
          t0: Number(t0),
          y0: Number(y0),
          tf: Number(tf),
          n_steps: Number(nSteps),
        })
      }

      const response = await fetch(url, options)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Error en el servidor matemático')
      }
      if (data.converged === false || data.success === false) {
        setErrorMsg(data.error || 'No se pudo completar el cálculo')
      }
      setResult(data)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  const sceneTitle = useMemo(() => {
    if (categoryId === 'ode') return `dy/dt = ${odeExpr}`
    if (categoryId === 'polynomials' && method !== 'aitken') return `P(x) · [${coeffsStr}]`
    if (categoryId === 'interpolation') return `${currentMethodObj.label} · x = ${xEval}`
    if (categoryId === 'linear_systems') return `Sistema Lineal Ax = b`
    if (method === 'float_ieee') return `IEEE 754 · ${floatNum}`
    return `f(x) = ${expression}`
  }, [categoryId, method, odeExpr, coeffsStr, currentMethodObj, xEval, floatNum, expression])

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
        <form onSubmit={handleCalculate} className="glass-section">
          <label className="field-label">
            <div className="field-header-row">
              <span>Método Numérico</span>
              <span className="method-badge">{currentMethodObj.tag}</span>
            </div>
            <select
              className="glass-select"
              value={method}
              onChange={(e) => {
                setMethod(e.target.value)
                setResult(null)
                setErrorMsg('')
              }}
            >
              {currentCategory.methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          {/* --- ENTRADAS UNIDAD 1: IEEE 754 --- */}
          {method === 'float_ieee' && (
            <label className="field-label">
              Número decimal a descomponer:
              <input
                className="glass-input"
                type="number"
                step="any"
                value={floatNum}
                onChange={(e) => setFloatNum(e.target.value)}
              />
            </label>
          )}

          {/* --- ENTRADAS UNIDAD 1: RAÍCES --- */}
          {(categoryId === 'closed_roots' || categoryId === 'open_roots') && method !== 'float_ieee' && (
            <>
              <label className="field-label">
                {method === 'fixed_point' ? 'Función despejada g(x):' : 'Función f(x):'}
                <input
                  className="glass-input"
                  type="text"
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                />
              </label>
              <div className="preset-bar">
                <button type="button" className="preset-btn" onClick={() => { setExpression('x^3 - 2*x - 5'); setA(1); setB(3); setX0(2) }}>
                  Polinomio clásico
                </button>
                <button type="button" className="preset-btn" onClick={() => { setExpression('(x - 1)^2 * (x - 3)'); setX0(0.5) }}>
                  Raíz múltiple
                </button>
                <button type="button" className="preset-btn" onClick={() => { setExpression('cos(x) - x'); setA(0); setB(1); setX0(0.5) }}>
                  Trascendente
                </button>
              </div>

              {categoryId === 'closed_roots' ? (
                <div className="input-row">
                  <label className="field-label">
                    Límite a:
                    <input className="glass-input" type="number" step="any" value={a} onChange={(e) => setA(e.target.value)} />
                  </label>
                  <label className="field-label">
                    Límite b:
                    <input className="glass-input" type="number" step="any" value={b} onChange={(e) => setB(e.target.value)} />
                  </label>
                </div>
              ) : (
                <div className="input-row">
                  <label className="field-label">
                    x0:
                    <input className="glass-input" type="number" step="any" value={x0} onChange={(e) => setX0(e.target.value)} />
                  </label>
                  {(method === 'secant' || method === 'muller') && (
                    <label className="field-label">
                      x1:
                      <input className="glass-input" type="number" step="any" value={x1} onChange={(e) => setX1(e.target.value)} />
                    </label>
                  )}
                  {method === 'muller' && (
                    <label className="field-label">
                      x2:
                      <input className="glass-input" type="number" step="any" value={x2} onChange={(e) => setX2(e.target.value)} />
                    </label>
                  )}
                </div>
              )}
              <label className="field-label">
                Tolerancia (%):
                <input className="glass-input" type="number" step="any" value={tol} onChange={(e) => setTol(e.target.value)} />
              </label>
            </>
          )}

          {/* --- ENTRADAS UNIDAD 2: POLINOMIOS Y ACELERACIÓN --- */}
          {categoryId === 'polynomials' && (
            <>
              {method === 'aitken' ? (
                <label className="field-label">
                  Sucesión g(x):
                  <input className="glass-input" type="text" value={expression} onChange={(e) => setExpression(e.target.value)} />
                </label>
              ) : (
                <label className="field-label">
                  Coeficientes [a_n, ..., a_0]:
                  <input className="glass-input" type="text" value={coeffsStr} onChange={(e) => setCoeffsStr(e.target.value)} />
                </label>
              )}
              {method === 'bairstow' ? (
                <div className="input-row">
                  <label className="field-label">
                    Semilla r:
                    <input className="glass-input" type="number" step="any" value={bairstowR} onChange={(e) => setBairstowR(e.target.value)} />
                  </label>
                  <label className="field-label">
                    Semilla s:
                    <input className="glass-input" type="number" step="any" value={bairstowS} onChange={(e) => setBairstowS(e.target.value)} />
                  </label>
                </div>
              ) : (
                <label className="field-label">
                  Valor inicial x0:
                  <input className="glass-input" type="number" step="any" value={x0} onChange={(e) => setX0(e.target.value)} />
                </label>
              )}
            </>
          )}

          {/* --- ENTRADAS UNIDAD 3: INTERPOLACIÓN --- */}
          {categoryId === 'interpolation' && (
            <>
              <label className="field-label">
                Nodos X (separados por coma):
                <input className="glass-input" type="text" value={xPtsStr} onChange={(e) => setXPtsStr(e.target.value)} />
              </label>
              <label className="field-label">
                Valores Y (separados por coma):
                <input className="glass-input" type="text" value={yPtsStr} onChange={(e) => setYPtsStr(e.target.value)} />
              </label>
              {method === 'hermite' && (
                <label className="field-label">
                  Derivadas Y' (separadas por coma):
                  <input className="glass-input" type="text" value={dyPtsStr} onChange={(e) => setDyPtsStr(e.target.value)} />
                </label>
              )}
              {method === 'cubic_spline' && (
                <>
                  <label className="field-label">
                    Condición de frontera:
                    <select className="glass-select" value={splineType} onChange={(e) => setSplineType(e.target.value)}>
                      <option value="natural">Spline Natural (S'' = 0)</option>
                      <option value="sujeto">Spline Sujeto (f'(x0), f'(xn))</option>
                    </select>
                  </label>
                  {splineType === 'sujeto' && (
                    <div className="input-row">
                      <label className="field-label">
                        f'(x0):
                        <input className="glass-input" type="number" step="any" value={fp0} onChange={(e) => setFp0(e.target.value)} />
                      </label>
                      <label className="field-label">
                        f'(xn):
                        <input className="glass-input" type="number" step="any" value={fpn} onChange={(e) => setFpn(e.target.value)} />
                      </label>
                    </div>
                  )}
                </>
              )}
              <label className="field-label">
                Punto a evaluar (x):
                <input className="glass-input" type="number" step="any" value={xEval} onChange={(e) => setXEval(e.target.value)} />
              </label>
            </>
          )}

          {/* --- ENTRADAS UNIDAD 4: CÁLCULO --- */}
          {categoryId === 'calculus' && (
            <>
              <label className="field-label">
                Función f(x):
                <input className="glass-input" type="text" value={expression} onChange={(e) => setExpression(e.target.value)} />
              </label>
              {method === 'diff' || method === 'richardson' ? (
                <div className="input-row">
                  <label className="field-label">
                    Punto x0:
                    <input className="glass-input" type="number" step="any" value={x0} onChange={(e) => setX0(e.target.value)} />
                  </label>
                  <label className="field-label">
                    Paso h:
                    <input className="glass-input" type="number" step="any" value={hStep} onChange={(e) => setHStep(e.target.value)} />
                  </label>
                  {method === 'diff' && (
                    <label className="field-label">
                      Puntos:
                      <select className="glass-select" value={calcPoints} onChange={(e) => setCalcPoints(Number(e.target.value))}>
                        <option value={2}>2 pts</option>
                        <option value={3}>3 pts</option>
                        <option value={5}>5 pts</option>
                      </select>
                    </label>
                  )}
                </div>
              ) : (
                <div className="input-row">
                  <label className="field-label">
                    Límite a:
                    <input className="glass-input" type="number" step="any" value={a} onChange={(e) => setA(e.target.value)} />
                  </label>
                  <label className="field-label">
                    Límite b:
                    <input className="glass-input" type="number" step="any" value={b} onChange={(e) => setB(e.target.value)} />
                  </label>
                  {method === 'gaussian' ? (
                    <label className="field-label">
                      Nodos Gauss:
                      <select className="glass-select" value={calcPoints} onChange={(e) => setCalcPoints(Number(e.target.value))}>
                        <option value={2}>n = 2</option>
                        <option value={3}>n = 3</option>
                        <option value={4}>n = 4</option>
                        <option value={5}>n = 5</option>
                      </select>
                    </label>
                  ) : method === 'romberg' ? (
                    <label className="field-label">
                      Niveles:
                      <input className="glass-input" type="number" value={levels} onChange={(e) => setLevels(e.target.value)} />
                    </label>
                  ) : (
                    <label className="field-label">
                      Subintervalos n:
                      <input className="glass-input" type="number" value={nIntervals} onChange={(e) => setNIntervals(e.target.value)} />
                    </label>
                  )}
                </div>
              )}
              {method === 'diff' && (
                <label className="field-label">
                  Esquema de diferencia:
                  <select className="glass-select" value={diffFormula} onChange={(e) => setDiffFormula(e.target.value)}>
                    <option value="centered">Centrada</option>
                    <option value="forward_endpoint">Progresiva (Extremo)</option>
                    <option value="backward_endpoint">Regresiva (Extremo)</option>
                  </select>
                </label>
              )}
            </>
          )}

          {/* --- ENTRADAS UNIDAD 5: SISTEMAS LINEALES --- */}
          {categoryId === 'linear_systems' && (
            <>
              <label className="field-label">
                Matriz A (una fila por línea, valores por coma):
                <textarea
                  className="glass-input"
                  rows={3}
                  value={matrixStr}
                  onChange={(e) => setMatrixStr(e.target.value)}
                />
              </label>
              <label className="field-label">
                Vector b (separado por coma):
                <input className="glass-input" type="text" value={vectorBStr} onChange={(e) => setVectorBStr(e.target.value)} />
              </label>
            </>
          )}

          {/* --- ENTRADAS UNIDAD 5: EDO --- */}
          {categoryId === 'ode' && (
            <>
              <label className="field-label">
                Ecuación dy/dt = f(t, y):
                <input className="glass-input" type="text" value={odeExpr} onChange={(e) => setOdeExpr(e.target.value)} />
              </label>
              <div className="input-row">
                <label className="field-label">
                  t0:
                  <input className="glass-input" type="number" step="any" value={t0} onChange={(e) => setT0(e.target.value)} />
                </label>
                <label className="field-label">
                  y(t0):
                  <input className="glass-input" type="number" step="any" value={y0} onChange={(e) => setY0(e.target.value)} />
                </label>
                <label className="field-label">
                  t final:
                  <input className="glass-input" type="number" step="any" value={tf} onChange={(e) => setTf(e.target.value)} />
                </label>
                <label className="field-label">
                  Pasos:
                  <input className="glass-input" type="number" value={nSteps} onChange={(e) => setNSteps(e.target.value)} />
                </label>
              </div>
            </>
          )}

          <button type="submit" className="execute-btn" disabled={loading}>
            {loading ? 'Procesando en motor...' : '⚡ Calcular y Renderizar 3D'}
          </button>
        </form>

        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        {/* TARJETA DE RESULTADO DESTACADO */}
        {result && (
          <div className="result-card">
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Resultado Obtenido
            </span>
            <div className="result-highlight">
              {result.root !== undefined && typeof result.root === 'number' && `Raíz: ${result.root.toFixed(8)}`}
              {result.root !== undefined && typeof result.root === 'object' && `Raíz: ${result.root.real} + ${result.root.imag}i`}
              {result.roots && `Raíces: ${result.roots.map((r) => `${r.real}${r.imag ? ` + ${r.imag}i` : ''}`).join(' | ')}`}
              {result.p_x0 !== undefined && `P(${result.x0}) = ${result.p_x0} | P'(${result.x0}) = ${result.dp_x0}`}
              {result.y_eval !== undefined && `P(${result.x_eval}) = ${result.y_eval}`}
              {result.derivative !== undefined && `f'(${result.x0}) = ${result.derivative}`}
              {result.integral !== undefined && `Integral ≈ ${result.integral}`}
              {result.solution && `x = [${result.solution.join(', ')}]`}
              {result.final_y !== undefined && `y(${result.final_t}) = ${result.final_y}`}
              {result.ieee754_32 && `32-bit: ${result.ieee754_32.binary}`}
            </div>
          </div>
        )}

        {/* TABLA RESUMIDA DE ITERACIONES O PASOS */}
        {result?.iterations?.length > 0 && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Aproximación</th>
                  <th>Error %</th>
                </tr>
              </thead>
              <tbody>
                {result.iterations.map((it) => (
                  <tr key={it.iter}>
                    <td>{it.iter}</td>
                    <td style={{ color: '#34d399' }}>
                      {it.root_approx !== undefined ? it.root_approx : it.x_real !== undefined ? `${it.x_real}+${it.x_imag}i` : `r=${it.r}`}
                    </td>
                    <td>{it.error_pct ?? it.error_r_pct ?? 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
              method={method}
              result={result}
              titleLabel={sceneTitle}
            />
          </XR>
        </Canvas>
      </main>
    </div>
  )
}