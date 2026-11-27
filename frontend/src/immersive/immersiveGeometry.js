import { buildOdeFrame } from '../scenes/odeGeometry.js'

export const MAX_STATIONS = 24
export const STATION_DISTANCE = 1.5

export const SUPPORTED_IMMERSIVE_KINDS = [
  'newton',
  'bisection',
  'secant',
  'lagrange',
  'neville',
  'trapezoid',
  'simpson_1_3',
  'simpson_3_8',
  'ode',
]

const ROOT_KINDS = ['newton', 'bisection', 'secant']
const INTERPOLATION_KINDS = ['lagrange', 'neville']

function buildCurveSegments(samples, X, Y, z) {
  const segments = []
  let current = []

  for (const [x, y] of samples ?? []) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      if (current.length > 1) segments.push(current)
      current = []
      continue
    }

    const point = [X(x), Y(y), z]

    if (
      current.length &&
      Math.abs(point[1] - current.at(-1)[1]) > 1
    ) {
      if (current.length > 1) segments.push(current)
      current = []
    }

    current.push(point)
  }

  if (current.length > 1) segments.push(current)

  return segments
}

export function buildImmersiveNewton(plot, page = 0) {
  if (
    !SUPPORTED_IMMERSIVE_KINDS.includes(plot?.kind) ||
    !plot.steps?.length
  ) return null

  const [xmin, xmax] = plot.domain
  const [ymin, ymax] = plot.range

  const pageCount = Math.ceil(
    plot.steps.length / MAX_STATIONS
  )

  const pageIndex = Math.max(
    0,
    Math.min(
      pageCount - 1,
      Number.isFinite(page) ? Math.floor(page) : 0
    )
  )

  const pageStart = pageIndex * MAX_STATIONS

  const visibleSteps = plot.steps.slice(
    pageStart,
    pageStart + MAX_STATIONS
  )

  const xExtent = Math.max(
    Math.abs(xmin), Math.abs(xmax), 0.1
  )

  const yExtent = Math.max(
    Math.abs(ymin), Math.abs(ymax), 0.1
  )

  const X = x => x / xExtent * 3.5
  const Y = y => 1.6 + y / yExtent * 1.35

  const Z = index =>
    -(index - pageStart) * STATION_DISTANCE

  const isRoot = ROOT_KINDS.includes(plot.kind)
  const isODE = plot.kind === 'ode'

  const isInterpolation =
    INTERPOLATION_KINDS.includes(plot.kind)

  const stations = visibleSteps.map((step, localIndex) => {
    const index = pageStart + localIndex
    const z = Z(index)

    const point = (x, y) => [X(x), Y(y), z]

    const segments = isODE ? [] : buildCurveSegments(
      plot.samples, X, Y, z
    )

    const odeFrame = isODE
      ? buildOdeFrame(plot, index, X, Y, z, false)
      : null

    let tangent = null
    let areaPolygon = null
    let current = null
    let next = null
    let primaryValue
    const extraPoints = []
    const guides = []

    if (isODE) {
      current = odeFrame.start
      next = odeFrame.end
      primaryValue = odeFrame.value
    } else if (isRoot) {
      current = point(step.x, step.fx)
      next = point(step.next_x, 0)
      primaryValue = step.next_x

      if (
        ['newton', 'secant'].includes(plot.kind) &&
        Number.isFinite(step.slope) &&
        step.slope !== 0
      ) {
        const x1 = step.x + (ymin - step.fx) / step.slope
        const x2 = step.x + (ymax - step.fx) / step.slope

        const left = Math.max(xmin, Math.min(x1, x2))
        const right = Math.min(xmax, Math.max(x1, x2))

        const lineY = x =>
          step.fx + step.slope * (x - step.x)

        if (left < right) {
          tangent = [
            point(left, lineY(left)),
            point(right, lineY(right)),
          ]
        }
      }

      if (plot.kind === 'secant') {
        extraPoints.push(
          point(step.previous_x, step.previous_fx)
        )
      }

      if (plot.kind === 'bisection') {
        extraPoints.push(
          point(step.a, step.fa),
          point(step.b, step.fb)
        )

        for (const x of [step.a, step.b]) {
          guides.push([
            point(x, ymin),
            point(x, ymax),
          ])
        }
      }
    } else if (isInterpolation) {
      const [evalX, evalY] = plot.evaluation

      // Punto correspondiente al polinomio final.
      current = point(evalX, evalY)

      // El resultado parcial se conserva como dato.
      primaryValue = step.value

      for (const i of step.node_indices) {
        const [x, y] = plot.nodes[i]
        extraPoints.push(point(x, y))
      }
    } else {
      // Aproximacion polinomica real del bloque.
      const points = step.points.map(
        ([x, y]) => point(x, y)
      )

      current = points[0]
      next = points.at(-1)
      primaryValue = step.value

      areaPolygon = [
        point(step.a, 0),
        ...points,
        point(step.b, 0),
        point(step.a, 0),
      ]

      for (const i of step.node_indices.slice(1, -1)) {
        const [x, y] = plot.nodes[i]
        extraPoints.push(point(x, y))
      }
    }

    return {
      index,
      z,
      segments,
      tangent,
      areaPolygon,
      guides,
      extraPoints,
      current,
      next,
      primaryValue,
      isRoot,
      isInterpolation,
      odeFrame,
      label: step.label ?? `Iteración ${index + 1}`,
      data: step,
    }
  })

  return {
    stations,
    pageIndex,
    pageCount,
    pageStart,
    totalSteps: plot.steps.length,
    xmin,
    xmax,
    ymin,
    ymax,
    X,
    Y,
    Z,
    depth: (stations.length - 1) * STATION_DISTANCE,
  }
}

export function formatImmersiveSummary(plot) {
  if (!plot) return 'Calcula un método o carga ejemplo'

  if (ROOT_KINDS.includes(plot.kind)) {
    if (plot.converged && Number.isFinite(plot.root)) {
      return `Raíz: ${plot.root.toFixed(8)}`
    }

    const last = plot.steps?.at(-1)?.next_x

    return Number.isFinite(last)
      ? `Sin converger: ${last.toFixed(8)}`
      : 'Sin convergencia'
  }

  if (INTERPOLATION_KINDS.includes(plot.kind)) {
    const [x, y] = plot.evaluation

    return `P(${x}) = ${y.toFixed(8)}`
  }

  if (plot.kind === 'ode') {
    return `y(${Number(plot.final_t.toPrecision(6))}) ≈ ${plot.final_y.toFixed(8)}`
  }

  if (Number.isFinite(plot.integral)) {
    return `Integral ≈ ${plot.integral.toFixed(8)}`
  }

  return 'Cálculo activo'
}
