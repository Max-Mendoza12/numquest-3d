import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildLinearGeometry,
  WORLD_RADIUS,
  WORLD_HEIGHT,
} from '../src/immersive/linearGeometry.js'

const plot = {
  kind: 'linear_system',
  solution: [1, 2, 3],
  steps: [
    {
      label: 'Sistema original',
      matrix: [
        [1, 1, 1, 6],
        [2, 1, 0, 4],
        [0, 1, 1, 5],
      ],
    },
    {
      label: 'Sistema triangular',
      matrix: [
        [1, 1, 1, 6],
        [0, -1, -2, -8],
        [0, 0, -1, -3],
      ],
    },
  ],
}

function mathCoordinates(point, geometry) {
  return [
    point[0] / WORLD_RADIUS * geometry.extent,
    (point[1] - WORLD_HEIGHT) /
      WORLD_RADIUS * geometry.extent,
    point[2] / WORLD_RADIUS * geometry.extent,
  ]
}

function residual(point, row, geometry) {
  const coords = mathCoordinates(point, geometry)

  return coords.reduce(
    (sum, value, i) => sum + value * row[i], 0
  ) - row[3]
}

test('Tres planos geometricos', () => {
  const geometry = buildLinearGeometry(plot)

  assert.equal(geometry.planes.length, 3)

  for (const plane of geometry.planes) {
    assert.ok(plane.vertices.length >= 3)
    assert.equal(plane.triangles.length % 9, 0)
    assert.ok(plane.triangles.every(Number.isFinite))
  }
})

test('Vertices satisfacen la ecuacion de cada plano', () => {
  const geometry = buildLinearGeometry(plot)

  for (const plane of geometry.planes) {
    for (const point of plane.vertices) {
      assert.ok(
        Math.abs(residual(point, plane.row, geometry)) < 1e-8
      )
    }
  }
})

test('Intersecciones satisfacen ambas ecuaciones', () => {
  const geometry = buildLinearGeometry(plot)

  assert.equal(geometry.intersections.length, 3)

  for (const line of geometry.intersections) {
    for (const point of line.points) {
      for (const index of line.rows) {
        const row = geometry.planes[index].row

        assert.ok(
          Math.abs(residual(point, row, geometry)) < 1e-8
        )
      }
    }
  }
})

test('Solucion comun a todos los planos', () => {
  const geometry = buildLinearGeometry(plot)

  for (const plane of geometry.planes) {
    assert.ok(Math.abs(residual(
      geometry.solutionPosition,
      plane.row,
      geometry
    )) < 1e-8)
  }
})

test('La solucion no cambia de posicion durante la eliminacion', () => {
  const first = buildLinearGeometry(plot, 0)
  const second = buildLinearGeometry(plot, 1)

  assert.deepEqual(
    first.solutionPosition,
    second.solutionPosition
  )

  for (const plane of second.planes) {
    assert.ok(Math.abs(residual(
      second.solutionPosition,
      plane.row,
      second
    )) < 1e-8)
  }
})

test('Escala uniforme y sistemas incompatibles', () => {
  const geometry = buildLinearGeometry(plot)

  const origin = geometry.toWorld([0, 0, 0])
  const x = geometry.toWorld([1, 0, 0])
  const y = geometry.toWorld([0, 1, 0])
  const z = geometry.toWorld([0, 0, 1])

  const distance = point => Math.hypot(
    ...point.map((value, i) => value - origin[i])
  )

  assert.ok(Math.abs(distance(x) - distance(y)) < 1e-10)
  assert.ok(Math.abs(distance(x) - distance(z)) < 1e-10)

  assert.equal(buildLinearGeometry(null), null)
  assert.equal(buildLinearGeometry(plot, 99), null)
})
