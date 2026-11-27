export const WORLD_RADIUS = 2.6
export const WORLD_HEIGHT = 2.8

const EPS = 1e-9

const dot = (a, b) =>
  a.reduce((sum, value, i) => sum + value * b[i], 0)

const sub = (a, b) => a.map((value, i) => value - b[i])

const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

const normalize = vector => {
  const length = Math.hypot(...vector)
  return vector.map(value => value / length)
}

function uniquePoints(points) {
  const result = []

  for (const point of points) {
    if (!result.some(other =>
      Math.hypot(...sub(point, other)) < EPS
    )) {
      result.push(point)
    }
  }

  return result
}

function intersectEdge(a, b, equation) {
  const distance = point =>
    dot(equation.normal, point) - equation.offset

  const da = distance(a)
  const db = distance(b)
  const result = []

  if (Math.abs(da) <= EPS) result.push(a)
  if (Math.abs(db) <= EPS) result.push(b)

  if (
    (da < -EPS && db > EPS) ||
    (da > EPS && db < -EPS)
  ) {
    const t = da / (da - db)

    result.push(
      a.map((value, i) =>
        value + t * (b[i] - value)
      )
    )
  }

  return result
}

function cubeEdges() {
  const vertices = []

  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        vertices.push([x, y, z])
      }
    }
  }

  const edges = []

  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const differences = vertices[i].filter(
        (value, k) => value !== vertices[j][k]
      ).length

      if (differences === 1) {
        edges.push([vertices[i], vertices[j]])
      }
    }
  }

  return edges
}

const EDGES = cubeEdges()

function clipPlane(equation) {
  const vertices = uniquePoints(
    EDGES.flatMap(([a, b]) =>
      intersectEdge(a, b, equation)
    )
  )

  if (vertices.length < 3) return null

  const center = [0, 1, 2].map(axis =>
    vertices.reduce(
      (sum, point) => sum + point[axis], 0
    ) / vertices.length
  )

  const reference = Math.abs(equation.normal[0]) < 0.9
    ? [1, 0, 0] : [0, 1, 0]

  const u = normalize(cross(equation.normal, reference))
  const v = cross(equation.normal, u)

  const angle = point => {
    const delta = sub(point, center)
    return Math.atan2(dot(delta, v), dot(delta, u))
  }

  vertices.sort((a, b) => angle(a) - angle(b))

  return { vertices, center }
}

function planeIntersection(polygon, equation) {
  const points = uniquePoints(
    polygon.vertices.flatMap((point, i) =>
      intersectEdge(
        point,
        polygon.vertices[(i + 1) % polygon.vertices.length],
        equation
      )
    )
  )

  if (points.length !== 2) return null

  return points
}

export function buildLinearGeometry(plot, step = 0) {
  if (
    plot?.kind !== 'linear_system' ||
    plot.solution?.length !== 3 ||
    !plot.solution.every(Number.isFinite) ||
    !plot.steps?.length
  ) return null

  const current = plot.steps[step]
  const matrix = current?.matrix

  if (
    matrix?.length !== 3 ||
    !matrix.every(row =>
      row.length === 4 && row.every(Number.isFinite)
    )
  ) return null

  // Escala uniforme: no distorsiona angulos ni planos.
  const extent = Math.max(
    1, ...plot.solution.map(Math.abs)
  ) * 1.35

  if (!Number.isFinite(extent)) return null

  const world = ([x, y, z]) => [
    x * WORLD_RADIUS,
    WORLD_HEIGHT + y * WORLD_RADIUS,
    z * WORLD_RADIUS,
  ]

  const equations = matrix.map(row => {
    const coefficients = row.slice(0, 3)
    const scale = Math.max(...coefficients.map(Math.abs))

    if (!Number.isFinite(scale) || scale === 0) return null

    const scaled = coefficients.map(value => value / scale)
    const length = Math.hypot(...scaled)

    return {
      normal: scaled.map(value => value / length),
      offset: ((row[3] / extent) / scale) / length,
    }
  })

  if (equations.some(equation =>
    !equation || !Number.isFinite(equation.offset)
  )) return null

  const polygons = equations.map(clipPlane)

  if (polygons.some(polygon => !polygon)) return null

  const planes = polygons.map((polygon, i) => {
    const vertices = polygon.vertices.map(world)
    const triangles = []

    for (let j = 1; j < vertices.length - 1; j++) {
      triangles.push(
        ...vertices[0],
        ...vertices[j],
        ...vertices[j + 1]
      )
    }

    return {
      index: i,
      row: matrix[i],
      vertices,
      triangles,
      center: world(polygon.center),
    }
  })

  const intersections = []

  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const line = planeIntersection(polygons[i], equations[j])

      if (line) {
        intersections.push({
          rows: [i, j],
          points: line.map(world),
        })
      }
    }
  }

  return {
    extent,
    planes,
    intersections,
    solution: plot.solution,
    solutionPosition: world(
      plot.solution.map(value => value / extent)
    ),
    toWorld: point => world(
      point.map(value => value / extent)
    ),
    label: current.label,
  }
}
