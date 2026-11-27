import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildImmersiveNewton,
} from '../src/immersive/immersiveGeometry.js'

import {
  readThumbstick,
  snapTurn,
} from '../src/immersive/locomotion.js'

const plot = {
  kind: 'newton',
  domain: [0, 3],
  range: [-2, 7],
  samples: [[0, -2], [1, -1], [2, 2]],
  steps: Array.from({ length: 60 }, (_, i) => ({
    x: 1 + i / 60,
    fx: (1 + i / 60)**2 - 2,
    slope: 2 * (1 + i / 60),
    next_x: 1.4,
  })),
}

test('Una sola grafica en cualquier iteracion', () => {
  for (const index of [0, 23, 24, 59]) {
    const geometry = buildImmersiveNewton(
      plot, 0, index
    )

    assert.equal(geometry.stations.length, 1)
    assert.equal(geometry.stations[0].index, index)
    assert.ok(geometry.stations[0].z === 0)
    assert.equal(geometry.totalSteps, 60)
  }
})

test('La grafica conserva la misma escala y origen', () => {
  const first = buildImmersiveNewton(plot, 0, 0)
  const last = buildImmersiveNewton(plot, 0, 59)

  assert.equal(first.X(2), last.X(2))
  assert.equal(first.Y(1), last.Y(1))
  assert.deepEqual(
    first.stations[0].segments,
    last.stations[0].segments
  )
})

test('Joystick izquierdo y derecho independientes', () => {
  const sources = [
    {
      handedness: 'left',
      gamepad: {
        mapping: 'xr-standard',
        axes: [0, 0, 0, -1],
      },
    },
    {
      handedness: 'right',
      gamepad: {
        mapping: 'xr-standard',
        axes: [0, 0, 1, 0],
      },
    },
  ]

  assert.deepEqual(
    readThumbstick(sources, 'left'), [0, -1]
  )

  assert.deepEqual(
    readThumbstick(sources, 'right'), [1, 0]
  )
})

test('Joystick sin entrada o dentro de zona muerta', () => {
  assert.deepEqual(
    readThumbstick([], 'left'), [0, 0]
  )

  const sources = [{
    handedness: 'left',
    gamepad: {
      mapping: 'xr-standard',
      axes: [0, 0, 0.02, 0.03],
    },
  }]

  assert.deepEqual(
    readThumbstick(sources, 'left'), [0, 0]
  )
})

test('Giro discreto de 30 grados sin repeticion', () => {
  const first = snapTurn(1, false)

  assert.equal(first.angle, -Math.PI / 6)
  assert.equal(first.latched, true)

  assert.equal(
    snapTurn(1, true).angle, 0
  )

  assert.equal(
    snapTurn(0, true).latched, false
  )
})
