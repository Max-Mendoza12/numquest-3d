import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildImmersiveNewton,
  formatImmersiveSummary,
  MAX_STATIONS,
  STATION_DISTANCE,
} from '../src/immersive/immersiveGeometry.js'

const plot = {
  kind: 'newton',
  domain: [0, 3],
  range: [-2, 7],
  converged: true,
  root: Math.sqrt(2),
  samples: Array.from({ length: 121 }, (_, i) => {
    const x = i / 40
    return [x, x*x - 2]
  }),
  steps: [
    {
      x: 1.5,
      fx: 0.25,
      slope: 3,
      next_x: 17 / 12,
    },
    {
      x: 17 / 12,
      fx: 1 / 144,
      slope: 17 / 6,
      next_x: 577 / 408,
    },
  ],
}

test('Estaciones por iteracion', () => {
  const geometry = buildImmersiveNewton(plot)
  assert.equal(geometry.stations.length, 2)
})

test('Separacion espacial constante', () => {
  const geometry = buildImmersiveNewton(plot)

  assert.equal(
    geometry.stations[0].z -
    geometry.stations[1].z,
    STATION_DISTANCE
  )
})

test('Coordenadas tridimensionales finitas', () => {
  const geometry = buildImmersiveNewton(plot)

  for (const station of geometry.stations) {
    for (const segment of station.segments) {
      for (const point of segment) {
        assert.equal(point.length, 3)
        assert.ok(point.every(Number.isFinite))
        assert.equal(point[2], station.z)
      }
    }
  }
})

test('Tangente pasa por punto actual', () => {
  const geometry = buildImmersiveNewton(plot)
  const station = geometry.stations[0]

  const [a, b] = station.tangent
  const x = station.current[0]

  const interpolatedY =
    a[1] + (b[1] - a[1]) *
    (x - a[0]) / (b[0] - a[0])

  assert.ok(
    Math.abs(interpolatedY - station.current[1]) < 1e-10
  )
})

test('Aproximacion siguiente pertenece al eje X', () => {
  const geometry = buildImmersiveNewton(plot)

  for (const station of geometry.stations) {
    assert.equal(station.next[1], geometry.Y(0))
    assert.equal(station.next[2], station.z)
    assert.equal(
      station.next[0],
      geometry.X(station.data.next_x)
    )
  }
})

test('Profundidad total del entorno', () => {
  const geometry = buildImmersiveNewton(plot)

  assert.equal(
    geometry.depth,
    (plot.steps.length - 1) * STATION_DISTANCE
  )
})

test('Rechazar resultados incompatibles', () => {
  assert.equal(buildImmersiveNewton(null), null)
  assert.equal(
    buildImmersiveNewton({ kind: 'lagrange' }),
    null
  )
})

test('Limitar estaciones por grupo sin perder pasos', () => {
  const longPlot = {
    ...plot,
    steps: Array(MAX_STATIONS + 1).fill(plot.steps[0]),
  }

  const first = buildImmersiveNewton(longPlot, 0)
  const second = buildImmersiveNewton(longPlot, 1)

  assert.equal(first.stations.length, MAX_STATIONS)
  assert.equal(first.pageCount, 2)
  assert.equal(first.totalSteps, MAX_STATIONS + 1)

  assert.equal(second.stations.length, 1)
  assert.equal(second.stations[0].index, MAX_STATIONS)
  assert.equal(second.pageStart, MAX_STATIONS)
})

test('Secante utiliza el punto anterior real', () => {
  const geometry = buildImmersiveNewton({
    ...plot,
    kind: 'secant',
    steps: [{
      previous_x: 1,
      previous_fx: -1,
      x: 2,
      fx: 2,
      slope: 3,
      next_x: 4 / 3,
    }],
  })

  const station = geometry.stations[0]

  assert.ok(station.tangent)

  assert.deepEqual(
    station.extraPoints[0],
    [geometry.X(1), geometry.Y(-1), station.z]
  )

  const [a, b] = station.tangent
  const x = geometry.X(4 / 3)

  const y = a[1] + (b[1] - a[1]) *
    (x - a[0]) / (b[0] - a[0])

  assert.ok(Math.abs(y - geometry.Y(0)) < 1e-10)
})

test('Biseccion representa ambos extremos del intervalo', () => {
  const geometry = buildImmersiveNewton({
    ...plot,
    kind: 'bisection',
    steps: [{
      a: 1,
      fa: -1,
      b: 2,
      fb: 2,
      x: 1.5,
      fx: 0.25,
      next_x: 1.5,
    }],
  })

  const station = geometry.stations[0]

  assert.equal(station.guides.length, 2)
  assert.equal(station.extraPoints.length, 2)

  assert.equal(
    station.extraPoints[0][1],
    geometry.Y(-1)
  )
})

test('Interpolacion usa evaluation y no el punto medio', () => {
  for (const kind of ['lagrange', 'neville']) {
    const geometry = buildImmersiveNewton({
      ...plot,
      kind,
      evaluation: [0.75, -1.4375],
      nodes: [[0, -2], [1, -1], [2, 2]],
      steps: [{
        label: 'Paso 1',
        value: -2,
        node_indices: [0],
      }],
    })

    const station = geometry.stations[0]

    assert.equal(station.current[0], geometry.X(0.75))
    assert.equal(station.current[1], geometry.Y(-1.4375))
    assert.equal(station.primaryValue, -2)
    assert.equal(station.next, null)
    assert.equal(station.extraPoints.length, 1)
  }
})

test('Integracion conserva la aproximacion de cada bloque', () => {
  for (const kind of [
    'trapezoid', 'simpson_1_3', 'simpson_3_8'
  ]) {
    const points = [[1, 1], [1.5, 2.25], [2, 4]]

    const geometry = buildImmersiveNewton({
      ...plot,
      kind,
      nodes: points,
      steps: [{
        label: 'Bloque 1',
        a: 1,
        b: 2,
        value: 7 / 3,
        contribution: 7 / 3,
        points,
        node_indices: [0, 1, 2],
      }],
    })

    const station = geometry.stations[0]

    assert.equal(station.areaPolygon.length, 6)

    assert.equal(
      station.areaPolygon[2][1],
      geometry.Y(2.25)
    )

    assert.equal(station.next[0], geometry.X(2))
    assert.equal(station.next[1], geometry.Y(4))
    assert.equal(station.primaryValue, 7 / 3)
  }
})

test('Una raiz nula no se convierte en cero', () => {
  const summary = formatImmersiveSummary({
    ...plot,
    root: null,
    converged: false,
  })

  assert.match(summary, /^Sin converger:/)
  assert.notEqual(summary, 'Aprox: 0.00000000')
})

test('Una raiz real igual a cero sigue siendo valida', () => {
  assert.equal(
    formatImmersiveSummary({
      ...plot,
      root: 0,
      converged: true,
    }),
    'Raíz: 0.00000000'
  )
})

test('Resumen de interpolacion utiliza evaluation', () => {
  assert.equal(
    formatImmersiveSummary({
      kind: 'lagrange',
      evaluation: [1.5, 2.25],
    }),
    'P(1.5) = 2.25000000'
  )
})
