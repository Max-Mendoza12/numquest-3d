import { useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Line, Text, Grid } from '@react-three/drei'
import { XR, createXRStore } from '@react-three/xr'
import * as THREE from 'three'

// Store de WebXR configurado para soporte nativo de manos en Meta Quest 3
const xrStore = createXRStore({
  hand: true,
  controller: true,
})

function MathScene3D({ iterations, root, expression }) {
  // Generamos puntos de referencia visual para la trayectoria de convergencia en el espacio 3D
  const iterationPoints = useMemo(() => {
    if (!iterations || iterations.length === 0) return []
    return iterations.map((it, idx) => {
      const xVal = it.root_approx ?? it.x_real ?? 0
      const yVal = it.fx ?? it.x_imag ?? 0
      // Escalamos suavemente para que quepa cómodo frente a los ojos en VR/PC
      const zDepth = (idx - iterations.length / 2) * 0.15
      return {
        pos: [
          THREE.MathUtils.clamp(xVal, -6, 6),
          THREE.MathUtils.clamp(yVal, -4, 4),
          zDepth,
        ],
        iter: it.iter,
        val: xVal,
        err: it.error_pct,
      }
    })
  }, [iterations])

  const lineCoords = useMemo(
    () => iterationPoints.map((p) => p.pos),
    [iterationPoints]
  )

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />

      {/* Controles de cámara con mouse en PC */}
      <OrbitControls makeDefault />

      {/* Cuadrícula espacial de referencia */}
      <Grid
        position={[0, -2, 0]}
        args={[14, 14]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#334155"
        sectionSize={2}
        sectionThickness={1.2}
        sectionColor="#38bdf8"
        fadeDistance={18}
      />

      {/* Ejes X e Y principales */}
      <Line points={[[-6, 0, 0], [6, 0, 0]]} color="#94a3b8" lineWidth={1.5} />
      <Line points={[[0, -4, 0], [0, 4, 0]]} color="#94a3b8" lineWidth={1.5} />

      {/* Título flotante 3D de la función */}
      <Text position={[0, 3.2, -1]} fontSize={0.28} color="#38bdf8">
        {`f(x) = ${expression}`}
      </Text>

      {/* Trayectoria que une las iteraciones en el espacio */}
      {lineCoords.length > 1 && (
        <Line points={lineCoords} color="#f59e0b" lineWidth={2.5} />
      )}

      {/* Esferas interactivas por cada iteración */}
      {iterationPoints.map((pt, index) => {
        const isLast = index === iterationPoints.length - 1
        return (
          <group key={pt.iter} position={pt.pos}>
            <mesh>
              <sphereGeometry args={[isLast ? 0.16 : 0.09, 24, 24]} />
              <meshStandardMaterial
                color={isLast ? '#10b981' : '#f59e0b'}
                emissive={isLast ? '#059669' : '#d97706'}
                emissiveIntensity={0.6}
              />
            </mesh>
            <Text
              position={[0, 0.25, 0]}
              fontSize={0.14}
              color={isLast ? '#34d399' : '#e2e8f0'}
            >
              {`#${pt.iter}: ${Number(pt.val).toFixed(4)}`}
            </Text>
          </group>
        )
      })}

      {/* Marcador de raíz final encontrada */}
      {root !== null && typeof root === 'number' && (
        <Text position={[0, -2.6, 0]} fontSize={0.24} color="#10b981">
          {`Raíz aproximada: ${root.toFixed(6)}`}
        </Text>
      )}
    </>
  )
}

export default function App() {
  const [method, setMethod] = useState('newton')
  const [expression, setExpression] = useState('x^3 - 2*x - 5')
  const [a, setA] = useState(1)
  const [b, setB] = useState(3)
  const [x0, setX0] = useState(2)
  const [x1, setX1] = useState(2.5)
  const [x2, setX2] = useState(3)
  const [tol, setTol] = useState(0.0001)

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleCalculate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const response = await fetch('/api/unit1/roots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          expression,
          a: Number(a),
          b: Number(b),
          x0: Number(x0),
          x1: Number(x1),
          x2: Number(x2),
          tol: Number(tol),
          max_iter: 50,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Error en el servidor matemático')
      }
      if (!data.converged) {
        setErrorMsg(data.error || 'El método no convergió')
      }
      setResult(data)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      
      {/* PANEL LATERAL DE CONTROL */}
      <div style={{ width: '360px', padding: '20px', background: '#1e293b', borderRight: '1px solid #334155', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h2 style={{ margin: 0, color: '#38bdf8', fontSize: '1.3rem' }}>NumQuest 3D</h2>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Unidad 1 · Raíces de Ecuaciones</p>

        {/* Botón para activar Realidad Mixta en Meta Quest 3 */}
        <button
          onClick={() => xrStore.enterAR()}
          style={{ padding: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🥽 Entrar a Realidad Mixta (Quest 3)
        </button>

        <form onSubmit={handleCalculate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '0.85rem' }}>
            Método Numérico:
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', background: '#0f172a', color: 'white', border: '1px solid #475569' }}
            >
              <option value="bisection">Bisección (Cerrado)</option>
              <option value="false_position">Falsa Posición (Cerrado)</option>
              <option value="fixed_point">Punto Fijo g(x) (Abierto)</option>
              <option value="newton">Newton-Raphson (Abierto)</option>
              <option value="secant">Secante (Abierto)</option>
              <option value="muller">Müller (Polinomios/Complejas)</option>
            </select>
          </label>

          <label style={{ fontSize: '0.85rem' }}>
            {method === 'fixed_point' ? 'Función despejada g(x):' : 'Función f(x):'}
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="Ej: x^3 - 2*x - 5"
              style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', background: '#0f172a', color: '#38bdf8', border: '1px solid #475569', boxSizing: 'border-box' }}
            />
          </label>

          {/* Entradas dinámicas según el método */}
          {(method === 'bisection' || method === 'false_position') && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <label style={{ flex: 1, fontSize: '0.85rem' }}>
                Límite a:
                <input type="number" step="any" value={a} onChange={(e) => setA(e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px', borderRadius: '6px', background: '#0f172a', color: 'white', border: '1px solid #475569', boxSizing: 'border-box' }} />
              </label>
              <label style={{ flex: 1, fontSize: '0.85rem' }}>
                Límite b:
                <input type="number" step="any" value={b} onChange={(e) => setB(e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px', borderRadius: '6px', background: '#0f172a', color: 'white', border: '1px solid #475569', boxSizing: 'border-box' }} />
              </label>
            </div>
          )}

          {(method === 'newton' || method === 'fixed_point' || method === 'secant' || method === 'muller') && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <label style={{ flex: 1, fontSize: '0.85rem' }}>
                x0:
                <input type="number" step="any" value={x0} onChange={(e) => setX0(e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px', borderRadius: '6px', background: '#0f172a', color: 'white', border: '1px solid #475569', boxSizing: 'border-box' }} />
              </label>
              {(method === 'secant' || method === 'muller') && (
                <label style={{ flex: 1, fontSize: '0.85rem' }}>
                  x1:
                  <input type="number" step="any" value={x1} onChange={(e) => setX1(e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px', borderRadius: '6px', background: '#0f172a', color: 'white', border: '1px solid #475569', boxSizing: 'border-box' }} />
                </label>
              )}
              {method === 'muller' && (
                <label style={{ flex: 1, fontSize: '0.85rem' }}>
                  x2:
                  <input type="number" step="any" value={x2} onChange={(e) => setX2(e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px', borderRadius: '6px', background: '#0f172a', color: 'white', border: '1px solid #475569', boxSizing: 'border-box' }} />
                </label>
              )}
            </div>
          )}

          <label style={{ fontSize: '0.85rem' }}>
            Tolerancia (%):
            <input type="number" step="any" value={tol} onChange={(e) => setTol(e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px', borderRadius: '6px', background: '#0f172a', color: 'white', border: '1px solid #475569', boxSizing: 'border-box' }} />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{ padding: '10px', background: '#10b981', color: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }}
          >
            {loading ? 'Calculando...' : 'Calcular y Visualizar 3D'}
          </button>
        </form>

        {errorMsg && (
          <div style={{ padding: '10px', background: '#7f1d1d', borderRadius: '6px', fontSize: '0.85rem', color: '#fecaca' }}>
            {errorMsg}
          </div>
        )}

        {/* Tabla resumida de iteraciones */}
        {result && result.iterations && result.iterations.length > 0 && (
          <div style={{ marginTop: '8px', fontSize: '0.8rem' }}>
            <strong style={{ color: '#38bdf8' }}>Iteraciones ({result.iterations.length}):</strong>
            <div style={{ maxHeight: '220px', overflowY: 'auto', marginTop: '6px', border: '1px solid #334155', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#0f172a', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '6px' }}>#</th>
                    <th style={{ padding: '6px' }}>Aprox</th>
                    <th style={{ padding: '6px' }}>Error %</th>
                  </tr>
                </thead>
                <tbody>
                  {result.iterations.map((it) => (
                    <tr key={it.iter} style={{ borderTop: '1px solid #334155' }}>
                      <td style={{ padding: '6px' }}>{it.iter}</td>
                      <td style={{ padding: '6px', color: '#34d399' }}>
                        {it.root_approx !== undefined ? it.root_approx : `${it.x_real} + ${it.x_imag}i`}
                      </td>
                      <td style={{ padding: '6px' }}>{it.error_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ESCENARIO 3D / WEBXR */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas camera={{ position: [0, 1.5, 6], fov: 50 }}>
          <XR store={xrStore}>
            <MathScene3D
              iterations={result?.iterations || []}
              root={result?.root ?? null}
              expression={expression}
            />
          </XR>
        </Canvas>
      </div>
    </div>
  )
}