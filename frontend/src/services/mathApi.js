const parseNumberList = (str) =>
  str
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n))

export function buildMathRequest({
  method,
  categoryId,
  floatNum,
  expression,
  a,
  b,
  x0,
  x1,
  x2,
  tol,
  coeffsStr,
  bairstowR,
  bairstowS,
  xPtsStr,
  yPtsStr,
  dyPtsStr,
  xEval,
  splineType,
  fp0,
  fpn,
  hStep,
  calcPoints,
  diffFormula,
  levels,
  nIntervals,
  matrixStr,
  vectorBStr,
  odeExpr,
  t0,
  y0,
  tf,
  nSteps,
}) {
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

  return { url, options }
}

export async function calculateMath(input) {
  const { url, options } = buildMathRequest(input)
  const response = await fetch(url, options)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || 'Error en el servidor matemático')
  }
  return data
}
