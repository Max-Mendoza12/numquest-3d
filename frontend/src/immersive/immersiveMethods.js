const field = (key, label, initial, type = 'number') => ({
  key, label, initial: String(initial), type,
})

const expression = field('expression', 'Función f(x)', 'x^2-2', 'expr')
const tolerance = field('tol', 'Tolerancia', 0.0001)

const interpolationFields = [
  field('xPtsStr', 'Nodos X', '0,1,2,3', 'list'),
  field('yPtsStr', 'Nodos Y', '0,1,4,9', 'list'),
  field('xEval', 'Evaluar en X', 1.5),
]

const integrationFields = [
  field('expression', 'Función f(x)', 'x^2', 'expr'),
  field('a', 'Límite inferior', 0),
  field('b', 'Límite superior', 3),
  field('nIntervals', 'Subintervalos', 6, 'int'),
]

const linearFields = [
  field(
    'matrixStr', 'Matriz A · 3×3',
    '3,-0.1,-0.2\n0.1,7,-0.3\n0.3,-0.2,10',
    'matrix'
  ),
  field('vectorBStr', 'Vector b', '7.85,-19.3,71.4', 'list'),
]

const odeFields = [
  field('odeExpr', 'Función f(t,y)', 'y', 'expr'),
  field('t0', 'Tiempo inicial', 0),
  field('y0', 'Valor inicial Y', 1),
  field('tf', 'Tiempo final', 1),
  field('nSteps', 'Número de pasos', 5, 'int'),
]

const method = (id, label, categoryId, fields) => ({
  id, label, categoryId, fields,
})

export const VR_FAMILIES = [
  {
    label: 'Raíces',
    methods: [
      method('newton', 'Newton-Raphson', 'open_roots', [
        expression,
        field('x0', 'Valor inicial x0', 1.5),
        tolerance,
      ]),
      method('bisection', 'Bisección', 'closed_roots', [
        expression,
        field('a', 'Extremo a', 1),
        field('b', 'Extremo b', 2),
        tolerance,
      ]),
      method('secant', 'Secante', 'open_roots', [
        expression,
        field('x0', 'Valor inicial x0', 1),
        field('x1', 'Valor inicial x1', 2),
        tolerance,
      ]),
    ],
  },
  {
    label: 'Interpolación',
    methods: [
      method('lagrange', 'Lagrange', 'interpolation', interpolationFields),
      method('neville', 'Neville', 'interpolation', interpolationFields),
    ],
  },
  {
    label: 'Integración',
    methods: [
      method('trapezoid', 'Trapecio', 'calculus', integrationFields),
      method('simpson_1_3', 'Simpson 1/3', 'calculus', integrationFields),
      method('simpson_3_8', 'Simpson 3/8', 'calculus', integrationFields),
    ],
  },
  {
    label: 'Sistemas lineales',
    methods: [
      method('gauss_trivial', 'Gauss trivial', 'linear_systems', linearFields),
      method('gauss_partial', 'Gauss parcial', 'linear_systems', linearFields),
      method('gauss_scaled', 'Gauss escalado', 'linear_systems', linearFields),
    ],
  },
  {
    label: 'Ecuaciones diferenciales',
    methods: [
      method('euler', 'Euler', 'ode', odeFields),
      method('taylor2', 'Taylor 2', 'ode', odeFields),
      method('modified_euler', 'Euler modificado', 'ode', odeFields),
      method('midpoint', 'Punto medio', 'ode', odeFields),
      method('rk4', 'Runge-Kutta 4', 'ode', odeFields),
    ],
  },
]

export const VR_METHODS = VR_FAMILIES.flatMap(
  family => family.methods
)

export function getVRMethod(id) {
  return VR_METHODS.find(item => item.id === id)
}

export function makeDraft(id, existing = {}) {
  const spec = getVRMethod(id) ?? VR_METHODS[0]

  return {
    method: spec.id,
    values: Object.fromEntries(
      spec.fields.map(item => [
        item.key,
        String(existing[item.key] ?? item.initial),
      ])
    ),
  }
}

const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i

function parseNumber(value) {
  const clean = String(value).trim()

  if (!DECIMAL.test(clean)) return null

  const number = Number(clean)

  return Number.isFinite(number) ? number : null
}

function parseList(value) {
  const numbers = value.split(',').map(parseNumber)

  return numbers.some(item => item === null)
    ? null : numbers
}

export function validateDraft(draft) {
  const spec = getVRMethod(draft.method)

  const fail = error => ({ preset: null, error })

  if (!spec) return fail('Método no compatible')

  const preset = {
    categoryId: spec.categoryId,
    method: spec.id,
  }

  for (const item of spec.fields) {
    const value = String(
      draft.values[item.key] ?? ''
    ).trim()

    if (!value || value.length > 240) {
      return fail(`Revisa: ${item.label}`)
    }

    if (item.type === 'expr') {
      preset[item.key] = value
      continue
    }

    if (item.type === 'matrix') {
      const rows = value.split('\n').map(parseList)

      if (
        rows.length !== 3 ||
        rows.some(row => !row || row.length !== 3)
      ) return fail('La matriz debe ser 3×3')

      preset[item.key] = value
      continue
    }

    if (item.type === 'list') {
      if (!parseList(value)) {
        return fail(`Lista inválida: ${item.label}`)
      }

      preset[item.key] = value
      continue
    }

    const number = parseNumber(value)

    if (number === null) {
      return fail(`Número inválido: ${item.label}`)
    }

    if (item.type === 'int') {
      if (!Number.isInteger(number) || number < 1 || number > 72) {
        return fail(`${item.label}: entero de 1 a 72`)
      }
    }

    preset[item.key] = number
  }

  if (preset.tol !== undefined && preset.tol <= 0) {
    return fail('La tolerancia debe ser positiva')
  }

  if (spec.id === 'secant' && preset.x0 === preset.x1) {
    return fail('x0 y x1 deben ser diferentes')
  }

  if (spec.id === 'bisection' && preset.a >= preset.b) {
    return fail('Bisección requiere a < b')
  }

  if (spec.categoryId === 'interpolation') {
    const xs = parseList(preset.xPtsStr)
    const ys = parseList(preset.yPtsStr)

    if (
      xs.length < 2 ||
      xs.length > 32 ||
      xs.length !== ys.length
    ) return fail('Introduce de 2 a 32 pares de nodos')

    if (new Set(xs).size !== xs.length) {
      return fail('Los nodos X deben ser diferentes')
    }
  }

  if (spec.categoryId === 'calculus') {
    if (preset.a === preset.b) {
      return fail('Los límites deben ser diferentes')
    }

    if (
      spec.id === 'simpson_1_3' &&
      preset.nIntervals % 2 !== 0
    ) return fail('Simpson 1/3 requiere n par')

    if (
      spec.id === 'simpson_3_8' &&
      preset.nIntervals % 3 !== 0
    ) return fail('Simpson 3/8 requiere múltiplo de 3')
  }

  if (
    spec.categoryId === 'linear_systems' &&
    parseList(preset.vectorBStr).length !== 3
  ) return fail('El vector b debe tener 3 valores')

  if (
    spec.categoryId === 'ode' &&
    preset.t0 === preset.tf
  ) return fail('Los tiempos deben ser diferentes')

  return { preset, error: '' }
}

export function editValue(value, key) {
  if (key === 'clear') return ''
  if (key === 'backspace') return value.slice(0, -1)

  return (value + key).slice(0, 240)
}

export function cycleIndex(index, delta, length) {
  return ((index + delta) % length + length) % length
}
