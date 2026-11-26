export const MAX_STATIONS = 24
export const STATION_DISTANCE = 1.5

export function buildImmersiveNewton(plot) {
  if (
    plot?.kind !== 'newton' ||
    !plot.steps?.length ||
    plot.steps.length > MAX_STATIONS
  ) return null

  const [xmin, xmax] = plot.domain
  const [ymin, ymax] = plot.range

  const xExtent = Math.max(
    Math.abs(xmin), Math.abs(xmax), 0.1
  )

  const yExtent = Math.max(
    Math.abs(ymin), Math.abs(ymax), 0.1
  )

  const X = x => x / xExtent * 3.5
  const Y = y => 1.6 + y / yExtent * 1.35
  const Z = iteration => -iteration * STATION_DISTANCE

  const stations = plot.steps.map((step, index) => {
    const z = Z(index)
    const segments = []
    let current = []

    for (const [x, y] of plot.samples) {
      if (!Number.isFinite(y)) {
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

    let tangent = null

    if (Number.isFinite(step.slope) && step.slope !== 0) {
      const x1 = step.x + (ymin - step.fx) / step.slope
      const x2 = step.x + (ymax - step.fx) / step.slope

      const left = Math.max(xmin, Math.min(x1, x2))
      const right = Math.min(xmax, Math.max(x1, x2))

      if (left < right) {
        const lineY = x =>
          step.fx + step.slope * (x - step.x)

        tangent = [
          [X(left), Y(lineY(left)), z],
          [X(right), Y(lineY(right)), z],
        ]
      }
    }

    return {
      index,
      z,
      segments,
      tangent,
      current: [X(step.x), Y(step.fx), z],
      next: [X(step.next_x), Y(0), z],
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
