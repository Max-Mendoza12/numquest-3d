export function rootMultiplePreset(categoryId) {
  if (categoryId === 'closed_roots') {
    return {
      label: 'Raíz triple (cambio de signo)',
      expression: '(x-1)^3',
      a: 0,
      b: 2,
      x0: 0.5,
      x1: 1.2,
      x2: 1.5,
    }
  }

  return {
    label: 'Raíz múltiple',
    expression: '(x-1)^2*(x-3)',
    a: 0,
    b: 2,
    x0: 0.5,
    x1: 1.2,
    x2: 1.5,
  }
}

export function normalizeDiffFormula(points, formula) {
  if (points === 2) {
    if (['backward', 'backward_endpoint'].includes(formula)) {
      return 'backward'
    }

    if (['forward', 'forward_endpoint', 'centered'].includes(formula)) {
      return 'forward'
    }
  }

  if (points === 3 || points === 5) {
    if (formula === 'forward') return 'forward_endpoint'
    if (formula === 'backward') return 'backward_endpoint'

    if ([
      'centered',
      'forward_endpoint',
      'backward_endpoint',
    ].includes(formula)) return formula
  }

  throw new Error('Esquema de derivación incompatible')
}
