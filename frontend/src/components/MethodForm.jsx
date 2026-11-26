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
  )
}
