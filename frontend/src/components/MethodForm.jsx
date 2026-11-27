import { useState } from 'react'

const MATH_KEYS = [
  'x', '^2', '^3', '^',
  'sin(', 'cos(', 'exp(', 'sqrt(',
  '+', '-', '*', '/',
  '(', ')', ',', '⌫',
]

function MathKeypad({ onInsert, onBackspace, onClear }) {
  return (
    <div
      className="math-keypad"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '6px',
        marginTop: '8px',
        marginBottom: '10px',
        padding: '8px',
        borderRadius: '10px',
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(148, 163, 184, 0.25)',
      }}
    >
      {MATH_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className="preset-btn"
          style={{
            padding: '8px 4px',
            fontSize: '0.88rem',
            fontWeight: 600,
            textAlign: 'center',
            minHeight: '36px',
          }}
          onClick={() => (key === '⌫' ? onBackspace() : onInsert(key))}
        >
          {key}
        </button>
      ))}
      <button
        type="button"
        className="preset-btn"
        style={{
          gridColumn: 'span 4',
          padding: '6px',
          fontSize: '0.78rem',
          color: '#fca5a5',
          borderColor: 'rgba(248, 113, 113, 0.35)',
        }}
        onClick={onClear}
      >
        Limpiar campo activo
      </button>
    </div>
  )
}

export default function MethodForm({
  categoryId,
  method,
  currentCategory,
  currentMethodObj,
  handleMethodChange,
  handleCalculate,
  loading,
  floatNum,
  setFloatNum,
  expression,
  setExpression,
  a,
  setA,
  b,
  setB,
  x0,
  setX0,
  x1,
  setX1,
  x2,
  setX2,
  tol,
  setTol,
  coeffsStr,
  setCoeffsStr,
  bairstowR,
  setBairstowR,
  bairstowS,
  setBairstowS,
  xPtsStr,
  setXPtsStr,
  yPtsStr,
  setYPtsStr,
  dyPtsStr,
  setDyPtsStr,
  xEval,
  setXEval,
  splineType,
  setSplineType,
  fp0,
  setFp0,
  fpn,
  setFpn,
  hStep,
  setHStep,
  calcPoints,
  setCalcPoints,
  diffFormula,
  setDiffFormula,
  nIntervals,
  setNIntervals,
  levels,
  setLevels,
  matrixStr,
  setMatrixStr,
  vectorBStr,
  setVectorBStr,
  odeExpr,
  setOdeExpr,
  t0,
  setT0,
  y0,
  setY0,
  tf,
  setTf,
  nSteps,
  setNSteps,
}) {
  // Rastrea qué campo de texto tocó por última vez el usuario para el Keypad XR
  const [activeTarget, setActiveTarget] = useState('expression')

  const getTargetHandler = () => {
    switch (activeTarget) {
      case 'odeExpr':
        return [odeExpr, setOdeExpr]
      case 'xPtsStr':
        return [xPtsStr, setXPtsStr]
      case 'yPtsStr':
        return [yPtsStr, setYPtsStr]
      case 'dyPtsStr':
        return [dyPtsStr, setDyPtsStr]
      case 'coeffsStr':
        return [coeffsStr, setCoeffsStr]
      case 'vectorBStr':
        return [vectorBStr, setVectorBStr]
      case 'expression':
      default:
        return [expression, setExpression]
    }
  }

  const handleKeyInsert = (token) => {
    const [val, setter] = getTargetHandler()
    setter(`${val ?? ''}${token}`)
  }

  const handleKeyBackspace = () => {
    const [val, setter] = getTargetHandler()
    const current = String(val ?? '')
    setter(current.slice(0, -1))
  }

  const handleKeyClear = () => {
    const [, setter] = getTargetHandler()
    setter('')
  }

  return (
    <form onSubmit={handleCalculate} className="glass-section">
      <label className="field-label">
        <div className="field-header-row">
          <span>Método Numérico</span>
          <span className="method-badge">{currentMethodObj.tag}</span>
        </div>
        <select
          className="glass-select"
          value={method}
          onChange={(e) => handleMethodChange(e.target.value)}
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
        <>
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
          <div className="preset-bar">
            <button type="button" className="preset-btn" onClick={() => setFloatNum(-13.625)}>
              -13.625
            </button>
            <button type="button" className="preset-btn" onClick={() => setFloatNum(0.1)}>
              0.1 (Periódico)
            </button>
            <button type="button" className="preset-btn" onClick={() => setFloatNum(3.141592)}>
              π aprox
            </button>
          </div>
        </>
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
              onFocus={() => setActiveTarget('expression')}
              onChange={(e) => setExpression(e.target.value)}
            />
          </label>

          <div className="preset-bar">
            {method === 'fixed_point' ? (
              <>
                <button type="button" className="preset-btn" onClick={() => { setExpression('cos(x)'); setX0(0.5) }}>
                  cos(x)
                </button>
                <button type="button" className="preset-btn" onClick={() => { setExpression('(2*x + 5)^(1/3)'); setX0(2) }}>
                  Raíz cúbica
                </button>
                <button type="button" className="preset-btn" onClick={() => { setExpression('exp(-x)'); setX0(0.5) }}>
                  exp(-x)
                </button>
              </>
            ) : (
              <>
                <button type="button" className="preset-btn" onClick={() => { setExpression('x^3 - 2*x - 5'); setA(1); setB(3); setX0(2); setX1(2.5); setX2(3) }}>
                  Polinomio clásico
                </button>
                <button type="button" className="preset-btn" onClick={() => { setExpression('(x - 1)^2 * (x - 3)'); setA(0); setB(2); setX0(0.5); setX1(1.2); setX2(1.5) }}>
                  Raíz múltiple
                </button>
                <button type="button" className="preset-btn" onClick={() => { setExpression('cos(x) - x'); setA(0); setB(1); setX0(0.5); setX1(0.8); setX2(1) }}>
                  Trascendente
                </button>
                <button type="button" className="preset-btn" onClick={() => { setExpression('exp(-x) - sin(x)'); setA(0); setB(1.5); setX0(0.4); setX1(0.8); setX2(1.2) }}>
                  Amortiguada
                </button>
              </>
            )}
          </div>

          <MathKeypad
            onInsert={(tok) => setExpression((prev) => `${prev ?? ''}${tok}`)}
            onBackspace={() => setExpression((prev) => String(prev ?? '').slice(0, -1))}
            onClear={() => setExpression('')}
          />

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
            <>
              <label className="field-label">
                Sucesión g(x):
                <input
                  className="glass-input"
                  type="text"
                  value={expression}
                  onFocus={() => setActiveTarget('expression')}
                  onChange={(e) => setExpression(e.target.value)}
                />
              </label>
              <div className="preset-bar">
                <button type="button" className="preset-btn" onClick={() => { setExpression('cos(x)'); setX0(0.5) }}>
                  cos(x)
                </button>
                <button type="button" className="preset-btn" onClick={() => { setExpression('exp(-x)'); setX0(0.5) }}>
                  exp(-x)
                </button>
              </div>
              <MathKeypad
                onInsert={(tok) => setExpression((prev) => `${prev ?? ''}${tok}`)}
                onBackspace={() => setExpression((prev) => String(prev ?? '').slice(0, -1))}
                onClear={() => setExpression('')}
              />
            </>
          ) : (
            <>
              <label className="field-label">
                Coeficientes [a_n, ..., a_0]:
                <input
                  className="glass-input"
                  type="text"
                  value={coeffsStr}
                  onFocus={() => setActiveTarget('coeffsStr')}
                  onChange={(e) => setCoeffsStr(e.target.value)}
                />
              </label>
              <div className="preset-bar">
                <button type="button" className="preset-btn" onClick={() => { setCoeffsStr('1, -3, 3, -1'); setX0(2); setBairstowR(-1); setBairstowS(-1) }}>
                  Grado 3
                </button>
                <button type="button" className="preset-btn" onClick={() => { setCoeffsStr('1, -3.5, 2.75, 2.125, -3.875, 1.25'); setX0(1.5); setBairstowR(-1); setBairstowS(-1) }}>
                  Grado 5 (Raíces complejas)
                </button>
              </div>
            </>
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
          <div className="preset-bar">
            <button
              type="button"
              className="preset-btn"
              onClick={() => {
                setXPtsStr('0, 1, 2, 3, 4')
                setYPtsStr('1, 2.7, 1.5, 4.2, 3.1')
                setDyPtsStr('1, 0.5, -1, 0.8, -0.5')
                setXEval(2.5)
              }}
            >
              Curva suave (5 pts)
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => {
                setXPtsStr('-2, -1, 0, 1, 2')
                setYPtsStr('0.038, 0.2, 1, 0.2, 0.038')
                setDyPtsStr('0.03, 0.3, 0, -0.3, -0.03')
                setXEval(1.5)
              }}
            >
              Fenómeno de Runge
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => {
                setXPtsStr('0, 1.57, 3.14, 4.71, 6.28')
                setYPtsStr('0, 1, 0, -1, 0')
                setDyPtsStr('1, 0, -1, 0, 1')
                setXEval(2.2)
              }}
            >
              Onda Seno
            </button>
          </div>

          <label className="field-label">
            Nodos X (separados por coma):
            <input
              className="glass-input"
              type="text"
              value={xPtsStr}
              onFocus={() => setActiveTarget('xPtsStr')}
              onChange={(e) => setXPtsStr(e.target.value)}
            />
          </label>
          <label className="field-label">
            Valores Y (separados por coma):
            <input
              className="glass-input"
              type="text"
              value={yPtsStr}
              onFocus={() => setActiveTarget('yPtsStr')}
              onChange={(e) => setYPtsStr(e.target.value)}
            />
          </label>
          {method === 'hermite' && (
            <label className="field-label">
              Derivadas Y' (separadas por coma):
              <input
                className="glass-input"
                type="text"
                value={dyPtsStr}
                onFocus={() => setActiveTarget('dyPtsStr')}
                onChange={(e) => setDyPtsStr(e.target.value)}
              />
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
            <input
              className="glass-input"
              type="text"
              value={expression}
              onFocus={() => setActiveTarget('expression')}
              onChange={(e) => setExpression(e.target.value)}
            />
          </label>

          <div className="preset-bar">
            <button type="button" className="preset-btn" onClick={() => { setExpression('sin(x) + 1.5'); setA(0); setB(6.28); setX0(1.5); setNIntervals(6) }}>
              Onda positiva
            </button>
            <button type="button" className="preset-btn" onClick={() => { setExpression('exp(-x^2)'); setA(-2); setB(2); setX0(0.5); setNIntervals(6) }}>
              Campana Gauss
            </button>
            <button type="button" className="preset-btn" onClick={() => { setExpression('0.2 + 25*x - 200*x^2 + 675*x^3 - 900*x^4 + 400*x^5'); setA(0); setB(0.8); setX0(0.4); setNIntervals(6) }}>
              Polinomio Chapra
            </button>
          </div>

          <MathKeypad
            onInsert={(tok) => setExpression((prev) => `${prev ?? ''}${tok}`)}
            onBackspace={() => setExpression((prev) => String(prev ?? '').slice(0, -1))}
            onClear={() => setExpression('')}
          />

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
          <div className="preset-bar">
            <button
              type="button"
              className="preset-btn"
              onClick={() => {
                setMatrixStr('3, -0.1, -0.2\n0.1, 7, -0.3\n0.3, -0.2, 10')
                setVectorBStr('7.85, -19.3, 71.4')
              }}
            >
              Sistema 3×3
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => {
                setMatrixStr('10, -1, 2, 0\n-1, 11, -1, 3\n2, -1, 10, -1\n0, 3, -1, 8')
                setVectorBStr('6, 25, -11, 15')
              }}
            >
              Sistema 4×4
            </button>
          </div>
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
            <input
              className="glass-input"
              type="text"
              value={odeExpr}
              onFocus={() => setActiveTarget('odeExpr')}
              onChange={(e) => setOdeExpr(e.target.value)}
            />
          </label>

          <div className="preset-bar">
            <button type="button" className="preset-btn" onClick={() => { setOdeExpr('-2*t^3 + 12*t^2 - 20*t + 8.5'); setT0(0); setY0(1); setTf(4); setNSteps(8) }}>
              Polinomio Chapra
            </button>
            <button type="button" className="preset-btn" onClick={() => { setOdeExpr('y - t^2 + 1'); setT0(0); setY0(0.5); setTf(2); setNSteps(10) }}>
              Crecimiento
            </button>
            <button type="button" className="preset-btn" onClick={() => { setOdeExpr('-0.5*y + sin(t)'); setT0(0); setY0(2); setTf(6); setNSteps(12) }}>
              Oscilatoria
            </button>
          </div>

          <MathKeypad
            onInsert={(tok) => setOdeExpr((prev) => `${prev ?? ''}${tok === 'x' ? 't' : tok}`)}
            onBackspace={() => setOdeExpr((prev) => String(prev ?? '').slice(0, -1))}
            onClear={() => setOdeExpr('')}
          />

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
  )
}