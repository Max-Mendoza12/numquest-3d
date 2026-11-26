import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMathRequest } from '../src/services/mathApi.js'

const defaults = {
  method: 'newton',
  categoryId: 'open_roots',
  floatNum: 13.625,
  expression: 'x^2-2',
  a: 1,
  b: 2,
  x0: 1.5,
  x1: 2,
  x2: 3,
  tol: 0.0001,
  coeffsStr: '1,0,-2',
  bairstowR: -1,
  bairstowS: -1,
  xPtsStr: '0,1,2',
  yPtsStr: '0,1,4',
  dyPtsStr: '0,2,4',
  xEval: 1.5,
  splineType: 'natural',
  fp0: 0,
  fpn: 4,
  hStep: 0.01,
  calcPoints: 3,
  diffFormula: 'centered',
  levels: 4,
  nIntervals: 12,
  matrixStr: '2,1\n1,3',
  vectorBStr: '5,5',
  odeExpr: 'y',
  t0: 0,
  y0: 1,
  tf: 1,
  nSteps: 10
}

const cases = [
  ['closed_roots', 'float_ieee', '/api/unit1/float/13.625'],
  ['closed_roots', 'bisection', '/api/unit1/roots'],
  ['open_roots', 'newton', '/api/unit1/roots'],
  ['polynomials', 'horner', '/api/unit2/polynomials'],
  ['interpolation', 'lagrange', '/api/unit3/interpolation'],
  ['calculus', 'trapezoid', '/api/unit4/calculus'],
  ['linear_systems', 'gauss_partial', '/api/unit5/linear-system'],
  ['ode', 'rk4', '/api/unit5/ode']
]

for (const [categoryId, method, expected] of cases) {
  test(`${categoryId}: ${method}`, () => {
    const request = buildMathRequest({
      ...defaults,
      categoryId,
      method
    })

    assert.equal(request.url, expected)

    assert.equal(
      request.options.method,
      method === 'float_ieee' ? 'GET' : 'POST'
    )

    if (method !== 'float_ieee') {
      const body = JSON.parse(request.options.body)
      assert.ok(body)

      if (categoryId === 'linear_systems') {
        assert.deepEqual(body.A, [[2, 1], [1, 3]])
        assert.deepEqual(body.b, [5, 5])
        assert.equal(body.pivoting, 'partial')
      } else {
        assert.equal(body.method, method)
      }
    }
  })
}
