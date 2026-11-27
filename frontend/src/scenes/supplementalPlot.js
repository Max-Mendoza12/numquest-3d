const finite = Number.isFinite

const realMethods = [
  'bisection', 'false_position', 'fixed_point',
  'newton', 'newton_multiple', 'secant',
  'steffensen', 'newton_horner', 'aitken',
]

function format(value) {
  return finite(value)
    ? String(Number(value.toPrecision(7)))
    : '—'
}

function complexLabel(real, imag) {
  return `${format(real)} ${imag < 0 ? '-' : '+'} ${format(Math.abs(imag))}i`
}

function point(x, y, color = '#22d3ee') {
  return finite(x) && finite(y)
    ? { x, y, color }
    : null
}

function frame(label, valueLabel, points = [], segments = []) {
  return {
    label,
    valueLabel,
    points: points.filter(Boolean),
    segments,
  }
}

function graph(title, axes, steps, options = {}) {
  if (!steps.length) return null

  return {
    kind: 'supplemental',
    title,
    axes,
    steps,
    curve: [],
    ...options,
  }
}

function tableTrace(rows, title, axis, key) {
  const steps = []

  for (const [index, row] of (rows ?? []).entries()) {
    const value = row.values?.[index]

    if (!finite(value)) continue

    steps.push(frame(
      `Nivel ${index + 1}`,
      `${key} ≈ ${format(value)}`,
      [point(index + 1, value)]
    ))
  }

  return graph(title, ['Nivel', axis], steps)
}

function complexRoots(roots) {
  const steps = []

  for (const [index, root] of (roots ?? []).entries()) {
    if (!finite(root.real) || !finite(root.imag)) continue

    steps.push(frame(
      `Raíz obtenida ${index + 1}`,
      complexLabel(root.real, root.imag),
      [point(root.real, root.imag)]
    ))
  }

  return graph(
    'Raíces en el plano complejo',
    ['Re(z)', 'Im(z)'],
    steps,
    { equalScale: true }
  )
}

export function buildSupplementalPlot(result, method) {
  if (!result) return null

  const status = result.converged === false ||
    result.success === false
      ? 'Cálculo no completado'
      : ''

  function finish(plot) {
    return plot ? { ...plot, status } : null
  }

  // IEEE: representación de bits, no de una función.
  if (method === 'float_ieee') {
    const steps = [32, 64].flatMap(width => {
      const data = result[`ieee754_${width}`]

      if (!data || typeof data.binary !== 'string') return []

      return [{
        ...frame(
          `IEEE 754 · ${width} bits`,
          `Número: ${format(result.input)}`
        ),
        bits: {
          sign: data.sign,
          exponent: data.exponent,
          mantissa: data.mantissa,
        },
      }]
    })

    return finish(graph(
      'Representación IEEE 754',
      ['Bit', 'Valor'],
      steps,
      { display: 'bits' }
    ))
  }

  // Müller: las aproximaciones pertenecen a C.
  if (method === 'muller') {
    const steps = []

    for (const [index, item] of (result.iterations ?? []).entries()) {
      const p = point(item.x_real, item.x_imag)

      if (!p) continue

      steps.push(frame(
        `Iteración ${item.iter ?? index + 1}`,
        complexLabel(item.x_real, item.x_imag),
        [p]
      ))
    }

    if (!steps.length && result.root) {
      return finish(complexRoots([result.root]))
    }

    return finish(graph(
      'Aproximaciones de Müller',
      ['Re(z)', 'Im(z)'],
      steps,
      { equalScale: true }
    ))
  }

  // Aproximaciones reales. El eje horizontal es
  // el índice de iteración, no la variable de f(x).
  if (realMethods.includes(method)) {
    const steps = []

    for (const [index, item] of (result.iterations ?? []).entries()) {
      const value = item.root_approx
      const iteration = item.iter ?? index + 1
      const p = point(iteration, value)

      if (!p) continue

      steps.push(frame(
        `Iteración ${iteration}`,
        `x ≈ ${format(value)}`,
        [p]
      ))
    }

    if (!steps.length && finite(result.root)) {
      steps.push(frame(
        'Raíz obtenida directamente',
        `x = ${format(result.root)}`,
        [point(0, result.root)]
      ))
    }

    return finish(graph(
      'Evolución de aproximaciones reales',
      ['Iteración', 'Aproximación x'],
      steps
    ))
  }

  // Horner: b y c de la división sintética.
  if (method === 'horner') {
    const steps = (result.steps ?? []).flatMap((item, index) => {
      if (!finite(item.b_val)) return []

      return [frame(
        `División sintética · Paso ${index + 1}`,
        `b = ${format(item.b_val)} · c = ${format(item.c_val)}`,
        [
          point(item.step ?? index, item.b_val),
          point(item.step ?? index, item.c_val, '#a78bfa'),
        ]
      )]
    })

    return finish(graph(
      'Coeficientes de Horner · b (cian), c (violeta)',
      ['Paso', 'Coeficiente'],
      steps
    ))
  }

  if (method === 'deflation') {
    return finish(complexRoots(
      result.roots ?? result.roots_found
    ))
  }

  if (method === 'bairstow') {
    const steps = []

    for (const [index, item] of (result.iterations ?? []).entries()) {
      const p = point(item.r, item.s)

      if (!p) continue

      steps.push(frame(
        `Iteración ${item.iter ?? index + 1}`,
        `r = ${format(item.r)} · s = ${format(item.s)}`,
        [p]
      ))
    }

    return finish(
      steps.length
        ? graph(
            'Parámetros del factor cuadrático',
            ['r', 's'],
            steps
          )
        : complexRoots(result.roots)
    )
  }

  // Curvas entregadas por los métodos de interpolación.
  const interpolation = [
    'vandermonde', 'lagrange', 'neville',
    'divided_differences', 'hermite', 'cubic_spline',
  ]

  if (interpolation.includes(method)) {
    const curve = (result.curve_points ?? [])
      .filter(item => finite(item.x) && finite(item.y))
      .map(item => [item.x, item.y])

    const evaluation = point(
      result.x_eval,
      result.y_eval,
      '#34d399'
    )

    if (curve.length < 2 || !evaluation) return null

    return finish(graph(
      'Curva de interpolación y evaluación',
      ['X', 'P(x)'],
      [frame(
        'Evaluación del interpolante',
        `P(${format(result.x_eval)}) = ${format(result.y_eval)}`,
        [evaluation]
      )],
      { curve }
    ))
  }

  // Derivación: puntos utilizados por la fórmula.
  if (method === 'diff') {
    const points = (result.evaluated_nodes ?? [])
      .map(item => point(item.x, item.fx))
      .filter(Boolean)

    if (!points.length || !finite(result.derivative)) return null

    return finish(graph(
      'Nodos de diferencias finitas',
      ['X', 'f(x)'],
      [frame(
        'Fórmula de derivación',
        `f′(${format(result.x0)}) ≈ ${format(result.derivative)}`,
        points
      )]
    ))
  }

  if (method === 'richardson') {
    return finish(tableTrace(
      result.richardson_table,
      'Diagonal de Richardson',
      'Derivada',
      'D'
    ))
  }

  if (method === 'romberg') {
    return finish(tableTrace(
      result.romberg_table,
      'Diagonal de Romberg',
      'Integral',
      'I'
    ))
  }

  if (method === 'adaptive') {
    const steps = []

    for (const [index, item] of (result.subintervals ?? []).entries()) {
      if (![item.a, item.b, item.area].every(finite)) continue

      steps.push(frame(
        `Subintervalo ${index + 1}`,
        `Aporte ≈ ${format(item.area)}`,
        [point(item.a, 0), point(item.b, 0)],
        [[[item.a, 0], [item.b, 0]]]
      ))
    }

    return finish(graph(
      'Subintervalos aceptados por cuadratura adaptativa',
      ['X', 'Referencia del intervalo'],
      steps
    ))
  }

  if (method === 'gaussian') {
    const steps = []

    for (const [index, item] of (result.gauss_nodes ?? []).entries()) {
      const p = point(item.x_mapped, item.fx)

      if (!p) continue

      steps.push(frame(
        `Nodo de Gauss ${index + 1}`,
        `f(x) = ${format(item.fx)} · peso = ${format(item.weight)}`,
        [p]
      ))
    }

    return finish(graph(
      'Nodos de cuadratura Gauss-Legendre',
      ['X', 'f(x)'],
      steps
    ))
  }

  // Respaldo de integración compuesta si no hay
  // geometría avanzada disponible.
  if (['trapezoid', 'simpson_1_3', 'simpson_3_8'].includes(method)) {
    const points = (result.nodes ?? [])
      .map(item => point(item.x, item.y))
      .filter(Boolean)

    if (!points.length || !finite(result.integral)) return null

    return finish(graph(
      'Nodos de integración',
      ['X', 'f(x)'],
      [frame(
        'Nodos utilizados',
        `Integral ≈ ${format(result.integral)}`,
        points
      )]
    ))
  }

  // Respaldo para sistemas de tamaño distinto a 3×3.
  if (Array.isArray(result.solution)) {
    const points = result.solution
      .map((value, index) => point(index + 1, value))
      .filter(Boolean)

    if (!points.length) return null

    const segments = points.map(p => [
      [p.x, 0], [p.x, p.y],
    ])

    return finish(graph(
      'Componentes del vector solución',
      ['Componente', 'Valor'],
      [frame(
        'Vector solución',
        `x = (${result.solution.map(format).join(', ')})`,
        points,
        segments
      )]
    ))
  }

  // Respaldo de EDO con muchos pasos.
  if (Array.isArray(result.trajectory)) {
    const steps = []

    for (let index = 1; index < result.trajectory.length; index++) {
      const start = result.trajectory[index - 1]
      const end = result.trajectory[index]

      if (![start.t, start.y, end.t, end.y].every(finite)) continue

      steps.push(frame(
        `Paso ${index}`,
        `y(${format(end.t)}) ≈ ${format(end.y)}`,
        [
          point(start.t, start.y, '#a78bfa'),
          point(end.t, end.y, '#34d399'),
        ],
        [[[start.t, start.y], [end.t, end.y]]]
      ))
    }

    return finish(graph(
      'Trayectoria numérica por paso',
      ['t', 'y(t)'],
      steps
    ))
  }

  return null
}

export function supplementalScale(plot) {
  let xExtent = 0
  let yExtent = 0

  function include(x, y) {
    if (finite(x)) xExtent = Math.max(xExtent, Math.abs(x))
    if (finite(y)) yExtent = Math.max(yExtent, Math.abs(y))
  }

  for (const [x, y] of plot.curve ?? []) include(x, y)

  for (const step of plot.steps) {
    for (const p of step.points) include(p.x, p.y)

    for (const segment of step.segments) {
      for (const [x, y] of segment) include(x, y)
    }
  }

  xExtent ||= 1
  yExtent ||= 1

  if (plot.equalScale) {
    const extent = Math.max(xExtent, yExtent)

    return {
      xExtent: extent,
      yExtent: extent,
      X: x => x / extent * 1.35,
      Y: y => 1.7 + y / extent * 1.35,
      width: 1.35,
    }
  }

  return {
    xExtent,
    yExtent,
    X: x => x / xExtent * 3.3,
    Y: y => 1.7 + y / yExtent * 1.35,
    width: 3.3,
  }
}
