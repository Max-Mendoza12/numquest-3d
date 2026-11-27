export function buildOdeFrame(
  plot, index, X, Y, z = 0, includeHistory = true
) {
  if (plot?.kind !== 'ode') return null

  const step = plot.steps[index]
  if (!step) return null

  const point = ([t, y]) => [X(t), Y(y), z]

  const history = includeHistory
    ? [
        plot.steps[0].start,
        ...plot.steps.slice(0, index)
          .flatMap(item => item.points.slice(1)),
      ].map(point)
    : []

  return {
    history,
    path: step.points.map(point),
    start: point(step.start),
    end: point(step.end),
    stages: step.stages.map(stage => ({
      label: stage.label,
      slope: stage.slope,
      point: point(stage.point),
      guide: stage.guide.map(point),
    })),
    value: step.value,
  }
}
