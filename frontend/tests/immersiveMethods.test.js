import test from 'node:test'
import assert from 'node:assert/strict'

import {
  VR_FAMILIES,
  VR_METHODS,
  makeDraft,
  validateDraft,
  editValue,
  cycleIndex,
} from '../src/immersive/immersiveMethods.js'

import {
  buildMathRequest,
} from '../src/services/mathApi.js'

test('Catalogo de 16 metodos sin duplicados', () => {
  assert.equal(VR_METHODS.length, 16)
  assert.equal(VR_FAMILIES.length, 5)

  assert.equal(
    new Set(VR_METHODS.map(item => item.id)).size,
    16
  )
})

test('Todos los presets VR son validos', () => {
  for (const method of VR_METHODS) {
    const result = validateDraft(makeDraft(method.id))

    assert.equal(result.error, '', method.id)
    assert.equal(result.preset.method, method.id)
    assert.equal(
      result.preset.categoryId,
      method.categoryId
    )
  }
})

test('Newton conserva expresion y tolerancia personalizada', () => {
  const draft = makeDraft('newton', {
    expression: 'cos(x)-x',
    x0: 1,
    tol: 0.000001,
  })

  const result = validateDraft(draft)
  assert.equal(result.error, '')

  const request = buildMathRequest(result.preset)
  const body = JSON.parse(request.options.body)

  assert.equal(body.expression, 'cos(x)-x')
  assert.equal(body.x0, 1)
  assert.equal(body.tol, 0.000001)
})

test('Rechazar valores vacios o no numericos', () => {
  for (const x0 of ['', 'abc', 'Infinity', '1e999']) {
    const draft = makeDraft('newton', { x0 })

    assert.ok(validateDraft(draft).error)
  }
})

test('Validar restricciones de Simpson', () => {
  const first = makeDraft('simpson_1_3', {
    nIntervals: 5,
  })

  const second = makeDraft('simpson_3_8', {
    nIntervals: 8,
  })

  assert.ok(validateDraft(first).error)
  assert.ok(validateDraft(second).error)
})

test('Validar nodos de interpolacion', () => {
  const repeated = makeDraft('lagrange', {
    xPtsStr: '0,1,1,3',
  })

  const incomplete = makeDraft('neville', {
    yPtsStr: '1,2',
  })

  assert.ok(validateDraft(repeated).error)
  assert.ok(validateDraft(incomplete).error)
})

test('Matriz personalizada se envia al endpoint correcto', () => {
  const draft = makeDraft('gauss_partial', {
    matrixStr: '1,0,0\n0,1,0\n0,0,1',
    vectorBStr: '1,2,3',
  })

  const result = validateDraft(draft)
  assert.equal(result.error, '')

  const request = buildMathRequest(result.preset)
  const body = JSON.parse(request.options.body)

  assert.equal(request.url, '/api/unit5/linear-system')
  assert.equal(body.pivoting, 'partial')

  assert.deepEqual(body.A, [
    [1,0,0], [0,1,0], [0,0,1],
  ])

  assert.deepEqual(body.b, [1,2,3])
})

test('Rechazar matriz y vector incompatibles', () => {
  const matrix = makeDraft('gauss_scaled', {
    matrixStr: '1,2\n3,4',
  })

  const vector = makeDraft('gauss_trivial', {
    vectorBStr: '1,2',
  })

  assert.ok(validateDraft(matrix).error)
  assert.ok(validateDraft(vector).error)
})

test('EDO conserva condiciones iniciales personalizadas', () => {
  const draft = makeDraft('rk4', {
    odeExpr: 't+y',
    t0: 0,
    y0: 2,
    tf: 3,
    nSteps: 12,
  })

  const result = validateDraft(draft)
  assert.equal(result.error, '')

  const request = buildMathRequest(result.preset)
  const body = JSON.parse(request.options.body)

  assert.equal(request.url, '/api/unit5/ode')
  assert.equal(body.expression, 't+y')
  assert.equal(body.y0, 2)
  assert.equal(body.tf, 3)
  assert.equal(body.n_steps, 12)
})

test('Validar duracion y cantidad de pasos EDO', () => {
  assert.ok(validateDraft(makeDraft(
    'euler', { tf: 0 }
  )).error)

  assert.ok(validateDraft(makeDraft(
    'rk4', { nSteps: 73 }
  )).error)

  assert.ok(validateDraft(makeDraft(
    'midpoint', { nSteps: 2.5 }
  )).error)
})

test('Teclado inserta borra y limpia', () => {
  assert.equal(editValue('x', '^2'), 'x^2')
  assert.equal(editValue('123', 'backspace'), '12')
  assert.equal(editValue('123', 'clear'), '')
  assert.equal(editValue('1,2,3', '\n'), '1,2,3\n')
  assert.equal(editValue('x'.repeat(240), '1').length, 240)
})

test('Navegacion circular entre familias y metodos', () => {
  assert.equal(cycleIndex(0, -1, 5), 4)
  assert.equal(cycleIndex(4, 1, 5), 0)
  assert.equal(cycleIndex(1, 1, 5), 2)
  assert.equal(cycleIndex(0, -1, 1), 0)
})
