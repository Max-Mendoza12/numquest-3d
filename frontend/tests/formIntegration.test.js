import test from 'node:test'
import assert from 'node:assert/strict'

import { buildMathRequest } from '../src/services/mathApi.js'
import {
  rootMultiplePreset,
  normalizeDiffFormula,
} from '../src/config/formRules.js'

const body = input =>
  JSON.parse(buildMathRequest(input).options.body)

test('IEEE conserva cero negativo textual y numerico', () => {
  for (const value of ['-0.0', '-0', -0]) {
    const request = buildMathRequest({
      categoryId: 'closed_roots',
      method: 'float_ieee',
      floatNum: value,
    })

    assert.equal(request.url, '/api/unit1/float/-0.0')
  }
})

test('IEEE conserva cero positivo', () => {
  assert.equal(buildMathRequest({
    categoryId: 'closed_roots',
    method: 'float_ieee',
    floatNum: '0',
  }).url, '/api/unit1/float/0')
})

test('Derivacion de dos puntos usa esquemas correctos', () => {
  for (const [formula, expected] of [
    ['backward_endpoint', 'backward'],
    ['forward_endpoint', 'forward'],
    ['centered', 'forward'],
  ]) {
    const request = body({
      categoryId: 'calculus',
      method: 'diff',
      expression: 'x^2',
      x0: 2,
      hStep: 0.1,
      calcPoints: 2,
      diffFormula: formula,
    })

    assert.equal(request.formula, expected)
  }
})

test('Derivacion de tres y cinco puntos conserva extremos', () => {
  for (const points of [3, 5]) {
    assert.equal(
      normalizeDiffFormula(points, 'backward'),
      'backward_endpoint'
    )
    assert.equal(
      normalizeDiffFormula(points, 'forward'),
      'forward_endpoint'
    )
  }

  assert.throws(() => normalizeDiffFormula(4, 'centered'))
})

test('Rechazar coeficientes invalidos sin omitir elementos', () => {
  for (const coeffsStr of [
    '1,abc,3', '1,,3', '1,Infinity,3',
    '1,2,', ',1,2', '1,0x10,2',
  ]) {
    assert.throws(() => body({
      categoryId: 'polynomials',
      method: 'horner',
      coeffsStr,
      x0: 2,
    }))
  }
})

test('Coeficientes cientificos y ceros se conservan', () => {
  assert.deepEqual(body({
    categoryId: 'polynomials',
    method: 'horner',
    coeffsStr: '1e-20,0,-2e-20',
    x0: 2,
  }).coeffs, [1e-20, 0, -2e-20])
})

test('Rechazar matrices incompatibles o con filas vacias', () => {
  for (const matrixStr of [
    '1,2\n3',
    '1,0\n\n0,1',
    '1,abc\n0,1',
  ]) {
    assert.throws(() => body({
      categoryId: 'linear_systems',
      method: 'gauss_partial',
      matrixStr,
      vectorBStr: '1,2',
    }))
  }
})

test('No utilizar campos ocultos de otros metodos', () => {
  const request = body({
    categoryId: 'interpolation',
    method: 'lagrange',
    xPtsStr: '0,1,2',
    yPtsStr: '0,1,4',
    dyPtsStr: 'entrada no utilizada',
    xEval: 1.5,
  })

  assert.equal(request.dy_pts, undefined)
  assert.equal(request.x_eval, 1.5)
})

test('Rechazar entradas numericas vacias y no finitas', () => {
  for (const x0 of ['', ' ', 'NaN', '1e999']) {
    assert.throws(() => body({
      categoryId: 'open_roots',
      method: 'newton',
      expression: 'x^2-2',
      x0,
      tol: 0.0001,
    }))
  }
})

test('Presets de raices multiples adaptados al metodo', () => {
  const closed = rootMultiplePreset('closed_roots')
  const open = rootMultiplePreset('open_roots')

  assert.equal(closed.expression, '(x-1)^3')
  assert.equal(closed.a, 0)
  assert.equal(closed.b, 2)

  assert.equal(open.expression, '(x-1)^2*(x-3)')
})

test('Richardson transmite niveles y paso personalizados', () => {
  const request = body({
    categoryId: 'calculus',
    method: 'richardson',
    expression: 'sin(x)',
    x0: 0,
    hStep: 0.1,
    levels: 5,
  })

  assert.equal(request.levels, 5)
  assert.equal(request.h, 0.1)
})

test('Cuadratura adaptativa transmite tolerancia absoluta', () => {
  const request = body({
    categoryId: 'calculus',
    method: 'adaptive',
    expression: 'sin(x)',
    a: 0,
    b: 1,
    tol: 1e-8,
    nIntervals: 'no utilizado',
  })

  assert.equal(request.tol, 1e-8)
  assert.equal(request.n, undefined)
})
