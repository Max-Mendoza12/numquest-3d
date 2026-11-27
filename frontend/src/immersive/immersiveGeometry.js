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
]

function buildCurveSegments(samples, X, Y, z) {
  if (!Array.isArray(samples)) return []
  const segments = []
  let current = []

  for (const [x, y] of samples) {
    if (!Number.isFinite(y)) {
      if (current.length > 1) segments.push(current)
      current = []
      continue
    }

    const point = [X(x), Y(y), z]

    if (current.length && Math.abs(point[1] - current.at(-1)[1]) > 1) {
      if (current.length > 1) segments.push(current)
      current = []
    }

    current.push(point)
  }

  if (current.length > 1) segments.push(current)
  return segments
}

export function buildImmersiveNewton(plot) {
  if (
    !SUPPORTED_IMMERSIVE_KINDS.includes(plot?.kind) ||
    !plot.steps?.length
  ) return null

  const visibleSteps = plot.steps.slice(0, MAX_STATIONS)
  const [xmin, xmax] = plot.domain
  const [ymin, ymax] = plot.range

  const xExtent = Math.max(Math.abs(xmin), Math.abs(xmax), 0.1)
  const yExtent = Math.max(Math.abs(ymin), Math.abs(ymax), 0.1)

  const X = x => (x / xExtent) * 3.5
  const Y = y => 1.6 + (y / yExtent) * 1.35
  const Z = iteration => -iteration * STATION_DISTANCE

  const isInterpolation = ['lagrange', 'neville'].includes(plot.kind)
  const isIntegration = ['trapezoid', 'simpson_1_3', 'simpson_3_8'].includes(plot.kind)

  const stations = visibleSteps.map((step, index) => {
    const z = Z(index)

    // Curva principal (o curva parcial de cada paso en interpolación si existe)
    const stepSamples = step.samples ?? plot.samples
    const segments = buildCurveSegments(stepSamples, X, Y, z)

    // Líneas auxiliares según el tipo de método
    let tangent = null
    let areaPolygon = null

    if (plot.kind === 'newton' && Number.isFinite(step.slope) && step.slope !== 0) {
      const x1 = step.x + (ymin - step.fx) / step.slope
      const x2 = step.x + (ymax - step.fx) / step.slope
      const left = Math.max(xmin, Math.min(x1, x2))
      const right = Math.min(xmax, Math.max(x1, x2))

      if (left < right) {
        const lineY = x => step.fx + step.slope * (x - step.x)
        tangent = [
          [X(left), Y(lineY(left)), z],
          [X(right), Y(lineY(right)), z],
        ]
      }
    } else if (plot.kind === 'secant' && Number.isFinite(step.x_prev) && Number.isFinite(step.x)) {
      const fxPrev = step.fx_prev ?? 0
      const fxCurr = step.fx ?? 0
      tangent = [
        [X(step.x_prev), Y(fxPrev), z],
        [X(step.x), Y(fxCurr), z],
        [X(step.next_x), Y(0), z],
      ]
    } else if (plot.kind === 'bisection' && Number.isFinite(step.a) && Number.isFinite(step.b)) {
      tangent = [
        [X(step.a), Y(ymin * 0.6), z],
        [X(step.a), Y(ymax * 0.6), z],
      ]
      areaPolygon = [
        [X(step.b), Y(ymin * 0.6), z],
        [X(step.b), Y(ymax * 0.6), z],
      ]
    } else if (isIntegration && Number.isFinite(step.a) && Number.isFinite(step.b)) {
      const fa = step.fa ?? 0
      const fb = step.fb ?? 0
      areaPolygon = [
        [X(step.a), Y(0), z],
        [X(step.a), Y(fa), z],
        [X(step.b), Y(fb), z],
        [X(step.b), Y(0), z],
        [X(step.a), Y(0), z],
      ]
    }

    // Marcadores de punto actual y siguiente/evaluado
    let currentPoint
    let nextPoint
    let primaryValue

    if (isInterpolation) {
      const evalX = plot.x_eval ?? (xmin + xmax) / 2
      const val = step.value ?? 0
      currentPoint = [X(evalX), Y(0), z]
      nextPoint = [X(evalX), Y(val), z]
      primaryValue = val
    } else if (isIntegration) {
      const midX = ((step.a ?? xmin) + (step.b ?? xmax)) / 2
      const val = step.value ?? 0
      currentPoint = [X(step.a ?? xmin), Y(step.fa ?? 0), z]
      nextPoint = [X(midX), Y(step.fb ?? 0), z]
      primaryValue = val
    } else {
      const currX = step.x ?? step.next_x ?? 0
      const currY = step.fx ?? 0
      const nxtX = step.next_x ?? currX
      currentPoint = [X(currX), Y(currY), z]
      nextPoint = [X(nxtX), Y(0), z]
      primaryValue = nxtX
    }

    return {
      index,
      z,
      segments,
      tangent,
      areaPolygon,
      current: currentPoint,
      next: nextPoint,
      primaryValue,
      label: step.label ?? `Iteración ${index + 1}`,
      data: step,
    }
  })

  return {
    stations,
    xmin,
    xmax,
    ymin,
    ymax,
    X,
    Y,
    Z,
    depth: Math.abs(Z(stations.length - 1)),
  }
}