import { CATEGORIES } from '../config/categories.js'
import { normalizeDiffFormula } from '../config/formRules.js'

const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i

function number(value, label) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string' || !DECIMAL.test(value.trim())) {
    throw new Error(`Número inválido: ${label}`)
  }

  const result = Number(value.trim())

  if (!Number.isFinite(result)) {
    throw new Error(`Número no finito: ${label}`)
  }

  return result
}

function positive(value, label) {
  const result = number(value, label)

  if (result <= 0) {
    throw new Error(`${label} debe ser positivo`)
  }

  return result
}

function integer(value, label) {
  const result = positive(value, label)

  if (!Number.isSafeInteger(result)) {
    throw new Error(`${label} debe ser un entero`)
  }

  return result
}

function expression(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Introduce una función matemática')
  }

  return value.trim()
}

function parseNumberList(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Lista vacía: ${label}`)
  }

  return value.split(',').map((item, i) =>
    number(item, `${label}, elemento ${i + 1}`)
  )
}

export function buildMathRequest(input) {
  const { method, categoryId } = input

  const category = CATEGORIES.find(item =>
    item.id === categoryId
  )

  if (!category?.methods.some(item => item.id === method)) {
    throw new Error('Método o categoría no reconocidos')
  }

  const n = (key, label = key) => number(input[key], label)
  const p = (key, label = key) => positive(input[key], label)
  const i = (key, label = key) => integer(input[key], label)
  const list = (key, label = key) => parseNumberList(input[key], label)

  let url
  let body

  if (method === 'float_ieee') {
    const value = n('floatNum', 'Número decimal')

    const encoded = Object.is(value, -0)
      ? '-0.0'
      : String(value)

    return {
      url: `/api/unit1/float/${encoded}`,
      options: { method: 'GET' },
    }
  }

  if (categoryId === 'closed_roots' || categoryId === 'open_roots') {
    url = '/api/unit1/roots'

    body = {
      method,
      expression: expression(input.expression),
      tol: p('tol', 'Tolerancia'),
      max_iter: 60,
    }

    if (categoryId === 'closed_roots') {
      body.a = n('a')
      body.b = n('b')
    } else {
      body.x0 = n('x0')

      if (method === 'secant' || method === 'muller') {
        body.x1 = n('x1')
      }

      if (method === 'muller') {
        body.x2 = n('x2')
      }
    }
  } else if (categoryId === 'polynomials') {
    url = '/api/unit2/polynomials'

    body = { method }

    if (method === 'aitken') {
      body.expression = expression(input.expression)
    } else {
      body.coeffs = list('coeffsStr', 'Coeficientes')
    }

    if (method === 'bairstow') {
      body.r = n('bairstowR', 'Semilla r')
      body.s = n('bairstowS', 'Semilla s')
    } else {
      body.x0 = n('x0')
    }

    if (method !== 'horner') {
      body.tol = p('tol', 'Tolerancia')
      body.max_iter = 60
    }
  } else if (categoryId === 'interpolation') {
    url = '/api/unit3/interpolation'

    body = {
      method,
      x_pts: list('xPtsStr', 'Nodos X'),
      y_pts: list('yPtsStr', 'Valores Y'),
      x_eval: n('xEval', 'Punto de evaluación'),
    }

    if (
      body.x_pts.length < 2 ||
      body.x_pts.length !== body.y_pts.length
    ) {
      throw new Error('Introduce al menos dos pares de nodos')
    }

    if (new Set(body.x_pts).size !== body.x_pts.length) {
      throw new Error('Los nodos X deben ser diferentes')
    }

    if (method === 'hermite') {
      body.dy_pts = list('dyPtsStr', 'Derivadas')

      if (body.dy_pts.length !== body.x_pts.length) {
        throw new Error('Hermite requiere una derivada por nodo')
      }
    }

    if (method === 'cubic_spline') {
      body.boundary_type = input.splineType

      if (!['natural', 'sujeto'].includes(body.boundary_type)) {
        throw new Error('Condición de frontera inválida')
      }

      if (body.boundary_type === 'sujeto') {
        body.fp0 = n('fp0')
        body.fpn = n('fpn')
      }
    }
  } else if (categoryId === 'calculus') {
    url = '/api/unit4/calculus'

    body = {
      method,
      expression: expression(input.expression),
    }

    if (method === 'diff' || method === 'richardson') {
      body.x0 = n('x0')
      body.h = n('hStep', 'Tamaño de paso')

      if (body.h === 0) {
        throw new Error('El tamaño de paso no puede ser cero')
      }

      if (method === 'diff') {
        body.points = i('calcPoints', 'Número de puntos')
        body.formula = normalizeDiffFormula(
          body.points, input.diffFormula
        )
      } else {
        body.levels = i('levels', 'Niveles')
      }
    } else {
      body.a = n('a')
      body.b = n('b')

      if (method === 'gaussian') {
        body.points = i('calcPoints', 'Nodos de Gauss')

        if (![2, 3, 4, 5].includes(body.points)) {
          throw new Error('Gauss-Legendre requiere de 2 a 5 nodos')
        }
      } else if (method === 'romberg') {
        body.levels = i('levels', 'Niveles')
        body.tol = p('tol', 'Tolerancia')
      } else if (method === 'adaptive') {
        body.tol = p('tol', 'Tolerancia')
      } else {
        body.n = i('nIntervals', 'Subintervalos')

        if (method === 'simpson_1_3' && body.n % 2 !== 0) {
          throw new Error('Simpson 1/3 requiere n par')
        }

        if (method === 'simpson_3_8' && body.n % 3 !== 0) {
          throw new Error('Simpson 3/8 requiere n múltiplo de 3')
        }
      }
    }
  } else if (categoryId === 'linear_systems') {
    url = '/api/unit5/linear-system'

    const rows = String(input.matrixStr ?? '')
      .trim()
      .split(/\r?\n/)
      .map((row, index) =>
        parseNumberList(row, `Matriz A, fila ${index + 1}`)
      )

    const vector = list('vectorBStr', 'Vector b')

    if (
      rows.some(row => row.length !== rows.length) ||
      vector.length !== rows.length
    ) {
      throw new Error('La matriz debe ser cuadrada y compatible con b')
    }

    const pivotingMap = {
      gauss_trivial: 'trivial',
      gauss_partial: 'partial',
      gauss_scaled: 'scaled',
    }

    body = {
      A: rows,
      b: vector,
      pivoting: pivotingMap[method],
    }
  } else if (categoryId === 'ode') {
    url = '/api/unit5/ode'

    body = {
      method,
      expression: expression(input.odeExpr),
      t0: n('t0'),
      y0: n('y0'),
      tf: n('tf'),
      n_steps: i('nSteps', 'Número de pasos'),
    }
  } else {
    throw new Error('Categoría no reconocida')
  }

  return {
    url,
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  }
}

export async function calculateMath(input) {
  const { url, options } = buildMathRequest(input)
  const response = await fetch(url, options)
  const data = await response.json()

  if (!response.ok) {
    const detail = data.detail

    const message = Array.isArray(detail)
      ? detail.map(item => item.msg).join('; ')
      : typeof detail === 'string'
        ? detail
        : 'Error en el servidor matemático'

    throw new Error(message)
  }

  return data
}
