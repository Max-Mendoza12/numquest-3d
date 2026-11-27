import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildSupplementalPlot,
  supplementalScale,
} from '../src/scenes/supplementalPlot.js'

const approximation = {
  converged: true,
  root: 1.4,
  iterations: [
    { iter: 1, root_approx: 1.5 },
    { iter: 2, root_approx: 1.4 },
  ],
}

const interpolation = {
  success: true,
  curve_points: [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 4 },
  ],
  x_eval: 1.5,
  y_eval: 2.25,
}

const cases = [
  ['float_ieee', {
    input: -13.625,
    ieee754_32: {
      binary: '1 | 10000010 | 101101',
      sign: '1',
      exponent: '10000010',
      mantissa: '101101' + '0'.repeat(17),
    },
    ieee754_64: {
      binary: '1 | 10000000010 | 101101',
      sign: '1',
      exponent: '10000000010',
      mantissa: '101101' + '0'.repeat(46),
    },
  }],

  ...[
    'false_position',
    'fixed_point',
    'newton_multiple',
    'steffensen',
    'newton_horner',
    'aitken',
  ].map(method => [method, approximation]),

  ['muller', {
    converged: true,
    iterations: [
      { iter: 1, x_real: 0.1, x_imag: 1.2 },
      { iter: 2, x_real: 0, x_imag: 1 },
    ],
  }],

  ['horner', {
    success: true,
    steps: [
      { step: 0, b_val: 1, c_val: 1 },
      { step: 1, b_val: 2, c_val: null },
    ],
  }],

  ['deflation', {
    converged: true,
    roots: [
      { real: 1, imag: 0 },
      { real: 0, imag: 1 },
      { real: 0, imag: -1 },
    ],
  }],

  ['bairstow', {
    converged: true,
    iterations: [
      { iter: 1, r: 2.1, s: -1.2 },
      { iter: 2, r: 2, s: -1 },
    ],
  }],

  ...[
    'vandermonde',
    'divided_differences',
    'hermite',
    'cubic_spline',
  ].map(method => [method, interpolation]),

  ['diff', {
    success: true,
    x0: 1,
    derivative: 2,
    evaluated_nodes: [
      { x: 0.9, fx: 0.81 },
      { x: 1.1, fx: 1.21 },
    ],
  }],

  ['richardson', {
    success: true,
    richardson_table: [
      { values: [0.9, null] },
      { values: [0.99, 1] },
    ],
  }],

  ['romberg', {
    success: true,
    romberg_table: [
      { values: [0.5, null] },
      { values: [0.375, 1 / 3] },
    ],
  }],

  ['adaptive', {
    success: true,
    subintervals: [
      { a: 0, b: 0.5, area: 0.125 },
      { a: 0.5, b: 1, area: 0.375 },
    ],
  }],

  ['gaussian', {
    success: true,
    gauss_nodes: [
      { x_mapped: 0.2, fx: 0.04, weight: 1 },
      { x_mapped: 0.8, fx: 0.64, weight: 1 },
    ],
  }],
]

assert.equal(cases.length, 20)

for (const [method, result] of cases) {
  test(`Representacion complementaria: ${method}`, () => {
    const plot = buildSupplementalPlot(result, method)

    assert.equal(plot.kind, 'supplemental')
    assert.ok(plot.steps.length > 0)

    for (const step of plot.steps) {
      assert.equal(typeof step.label, 'string')
      assert.equal(typeof step.valueLabel, 'string')

      for (const point of step.points) {
        assert.ok(Number.isFinite(point.x))
        assert.ok(Number.isFinite(point.y))
      }
    }
  })
}

test('Muller conserva parte imaginaria y escala uniforme', () => {
  const plot = buildSupplementalPlot({
    iterations: [
      { iter: 1, x_real: 2, x_imag: -3 },
    ],
  }, 'muller')

  assert.equal(plot.steps[0].points[0].y, -3)

  const scale = supplementalScale(plot)

  assert.ok(Math.abs(
    scale.X(1) - (scale.Y(1) - scale.Y(0))
  ) < 1e-12)
})

test('Raiz exacta sin iteraciones conserva el cero', () => {
  const plot = buildSupplementalPlot({
    converged: true,
    root: 0,
    iterations: [],
  }, 'newton')

  assert.equal(plot.steps.length, 1)
  assert.equal(plot.steps[0].points[0].y, 0)
})

test('Vector de un sistema 4x4 no se convierte en planos falsos', () => {
  const plot = buildSupplementalPlot({
    solution: [1, 2, -1, 1],
  }, 'gauss_partial')

  assert.equal(plot.steps.length, 1)
  assert.equal(plot.steps[0].points.length, 4)
  assert.equal(plot.steps[0].segments.length, 4)
})

test('EDO complementaria representa un segmento por paso', () => {
  const plot = buildSupplementalPlot({
    trajectory: [
      { t: 0, y: 1 },
      { t: 1, y: 2 },
      { t: 2, y: 4 },
    ],
  }, 'rk4')

  assert.equal(plot.steps.length, 2)
  assert.deepEqual(
    plot.steps[1].segments,
    [[[1, 2], [2, 4]]]
  )
})

test('Geometria no inventada para datos ausentes', () => {
  assert.equal(buildSupplementalPlot(null, 'muller'), null)
  assert.equal(buildSupplementalPlot({}, 'muller'), null)
})

test('Un calculo fallido conserva su estado', () => {
  const plot = buildSupplementalPlot({
    ...approximation,
    converged: false,
  }, 'fixed_point')

  assert.equal(plot.status, 'Cálculo no completado')
})
