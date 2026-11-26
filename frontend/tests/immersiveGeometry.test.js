import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildImmersiveNewton,
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

test('Limitar estaciones por rendimiento', () => {
  const result = buildImmersiveNewton({
    ...plot,
    steps: Array(MAX_STATIONS + 1).fill(plot.steps[0]),
  })

  assert.equal(result, null)
})
