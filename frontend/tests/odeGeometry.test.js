import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildOdeFrame,
} from '../src/scenes/odeGeometry.js'

import {
  buildImmersiveNewton,
  formatImmersiveSummary,
  MAX_STATIONS,
} from '../src/immersive/immersiveGeometry.js'

const step = {
  label: 'Paso 1',
  start: [0, 1],
  end: [1, 2],
  value: 2,
  h: 1,
  points: [[0, 1], [1, 2]],
  stages: [{
    label: 'k1',
    slope: 1,
    point: [0, 1],
    guide: [[0, 1], [0.18, 1.18]],
  }],
}

const second = {
  ...step,
  label: 'Paso 2',
  start: [1, 2],
  end: [2, 4],
  value: 4,
  points: [[1, 2], [2, 4]],
  stages: [{
    label: 'k1',
    slope: 2,
    point: [1, 2],
    guide: [[1, 2], [1.18, 2.36]],
  }],
}

const plot = {
  kind: 'ode',
  method: 'euler',
  domain: [-0.1, 2.1],
  range: [-0.5, 4.5],
  final_t: 2,
  final_y: 4,
  samples: [[0, 1], [1, 2], [2, 4]],
  steps: [step, second],
}

const identity = value => value

test('Etapas EDO en coordenadas correctas', () => {
  const frame = buildOdeFrame(
    plot, 0, identity, identity
  )

  assert.deepEqual(frame.start, [0, 1, 0])
  assert.deepEqual(frame.end, [1, 2, 0])
  assert.deepEqual(frame.stages[0].point, [0, 1, 0])
})

test('Trayectoria aceptada sin pasos futuros', () => {
  const frame = buildOdeFrame(
    plot, 1, identity, identity
  )

  assert.deepEqual(
    frame.history,
    [[0, 1, 0], [1, 2, 0]]
  )

  assert.deepEqual(
    frame.path,
    [[1, 2, 0], [2, 4, 0]]
  )
})

test('Geometria EDO inmersiva', () => {
  const geometry = buildImmersiveNewton(plot)

  assert.equal(geometry.stations.length, 2)

  for (const station of geometry.stations) {
    assert.ok(station.odeFrame)
    assert.equal(station.isRoot, false)
    assert.equal(station.next[2], station.z)
    assert.ok(station.next.every(Number.isFinite))
    assert.equal(station.odeFrame.history.length, 0)
  }
})

test('La paginacion conserva los pasos EDO', () => {
  const geometry = buildImmersiveNewton({
    ...plot,
    steps: Array(MAX_STATIONS + 2).fill(step),
  }, 1)

  assert.equal(geometry.stations.length, 2)
  assert.equal(geometry.stations[0].index, MAX_STATIONS)
})

test('Resumen EDO correcto', () => {
  assert.equal(
    formatImmersiveSummary(plot),
    'y(2) ≈ 4.00000000'
  )
})

test('Rechazar pasos inexistentes', () => {
  assert.equal(
    buildOdeFrame(plot, 99, identity, identity),
    null
  )
})
