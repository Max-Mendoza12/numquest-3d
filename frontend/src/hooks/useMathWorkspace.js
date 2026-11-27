import { useState, useMemo, useRef } from 'react'
import { CATEGORIES } from '../config/categories.js'
import { calculateMath } from '../services/mathApi.js'

export function useMathWorkspace() {
  const [categoryId, setCategoryId] = useState('open_roots')
  const [method, setMethod] = useState('newton')

  // Estados de entradas para los 33 métodos
  const [floatNum, setFloatNum] = useState(-13.625)
  const [expression, setExpression] = useState('x^3 - 2*x - 5')
  const [a, setA] = useState(1)
  const [b, setB] = useState(3)
  const [x0, setX0] = useState(2)
  const [x1, setX1] = useState(2.5)
  const [x2, setX2] = useState(3)
  const [tol, setTol] = useState(0.0001)

  // Polinomios
  const [coeffsStr, setCoeffsStr] = useState('1, -6, 11, -6')
  const [bairstowR, setBairstowR] = useState(-1)
  const [bairstowS, setBairstowS] = useState(-1)

  // Interpolación
  const [xPtsStr, setXPtsStr] = useState('0, 1, 2, 3')
  const [yPtsStr, setYPtsStr] = useState('1, 2.718, 7.389, 20.085')
  const [dyPtsStr, setDyPtsStr] = useState('1, 2.718, 7.389, 20.085')
  const [xEval, setXEval] = useState(1.5)
  const [splineType, setSplineType] = useState('natural')
  const [fp0, setFp0] = useState(1)
  const [fpn, setFpn] = useState(20.085)

  // Cálculo
  const [hStep, setHStep] = useState(0.01)
  const [calcPoints, setCalcPoints] = useState(3)
  const [diffFormula, setDiffFormula] = useState('centered')
  const [nIntervals, setNIntervals] = useState(12)
  const [levels, setLevels] = useState(4)

  // Sistemas Lineales
  const [matrixStr, setMatrixStr] = useState('3, -0.1, -0.2\n0.1, 7, -0.3\n0.3, -0.2, 10')
  const [vectorBStr, setVectorBStr] = useState('7.85, -19.3, 71.4')

  // EDO
  const [odeExpr, setOdeExpr] = useState('y - t^2 + 1')
  const [t0, setT0] = useState(0)
  const [y0, setY0] = useState(0.5)
  const [tf, setTf] = useState(2)
  const [nSteps, setNSteps] = useState(15)

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)
  const [errorMsg, setErrorMsg] = useState('')

  const currentCategory = useMemo(
    () => CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[0],
    [categoryId]
  )

  const currentMethodObj = useMemo(
    () => currentCategory.methods.find((m) => m.id === method) || currentCategory.methods[0],
    [currentCategory, method]
  )

  const handleCategoryChange = (newCatId) => {
    requestId.current += 1
    setLoading(false)
    setCategoryId(newCatId)
    const cat = CATEGORIES.find((c) => c.id === newCatId)
    if (cat && cat.methods.length > 0) {
      setMethod(cat.methods[0].id)
    }
    setResult(null)
    setErrorMsg('')
  }

  const handleMethodChange = (newMethod) => {
    requestId.current += 1
    setLoading(false)
    setMethod(newMethod)
    setResult(null)
    setErrorMsg('')
  }

  const handleCalculate = async (e, preset = null) => {
    e?.preventDefault()
    if (loading) return

    const id = ++requestId.current

    if (preset) {
      setCategoryId(preset.categoryId)
      setMethod(preset.method)
      if (preset.expression !== undefined) {
        setExpression(preset.expression)
      }

      if (preset.xPtsStr !== undefined) setXPtsStr(preset.xPtsStr)
      if (preset.yPtsStr !== undefined) setYPtsStr(preset.yPtsStr)
      if (preset.xEval !== undefined) setXEval(preset.xEval)
      if (preset.x0 !== undefined) setX0(preset.x0)
      if (preset.x1 !== undefined) setX1(preset.x1)
      if (preset.a !== undefined) setA(preset.a)
      if (preset.b !== undefined) setB(preset.b)
      if (preset.nIntervals !== undefined) {
        setNIntervals(preset.nIntervals)
      }
      if (preset.odeExpr !== undefined) setOdeExpr(preset.odeExpr)
      if (preset.t0 !== undefined) setT0(preset.t0)
      if (preset.y0 !== undefined) setY0(preset.y0)
      if (preset.tf !== undefined) setTf(preset.tf)
      if (preset.nSteps !== undefined) setNSteps(preset.nSteps)

      setTol(preset.tol)
    }
    setLoading(true)
    setResult(null)
    setErrorMsg('')

    try {
      const data = await calculateMath({
        method,
        categoryId,
        floatNum,
        expression,
        a,
        b,
        x0,
        x1,
        x2,
        tol,
        coeffsStr,
        bairstowR,
        bairstowS,
        xPtsStr,
        yPtsStr,
        dyPtsStr,
        xEval,
        splineType,
        fp0,
        fpn,
        hStep,
        calcPoints,
        diffFormula,
        levels,
        nIntervals,
        matrixStr,
        vectorBStr,
        odeExpr,
        t0,
        y0,
        tf,
        nSteps,
        ...preset,
      })

      if (id !== requestId.current) return

      if (data.converged === false || data.success === false) {
        setErrorMsg(data.error || 'No se pudo completar el cálculo')
      }
      setResult(data)
    } catch (err) {
      if (id === requestId.current) {
        setErrorMsg(err.message)
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false)
      }
    }
  }

  const sceneTitle = useMemo(() => {
    if (categoryId === 'ode') return `dy/dt = ${odeExpr}`
    if (categoryId === 'polynomials' && method !== 'aitken') return `P(x) · [${coeffsStr}]`
    if (categoryId === 'interpolation') return `${currentMethodObj.label} · x = ${xEval}`
    if (categoryId === 'linear_systems') return `Sistema Lineal Ax = b`
    if (method === 'float_ieee') return `IEEE 754 · ${floatNum}`
    return `f(x) = ${expression}`
  }, [categoryId, method, odeExpr, coeffsStr, currentMethodObj, xEval, floatNum, expression])

  return {
    categoryId,
    currentCategory,
    result,
    errorMsg,
    sceneTitle,
    handleCategoryChange,
    loadMathExample: example => handleCalculate(null, {
      ...example,
      categoryId: example.categoryId ??
        (['lagrange', 'neville'].includes(example.method)
          ? 'interpolation'
          : example.method === 'bisection'
            ? 'closed_roots' : 'open_roots'),
      method: example.method ?? 'newton',
      tol: 0.0001,
    }),
    formProps: {
      categoryId,
      method,
      currentCategory,
      currentMethodObj,
      handleMethodChange,
      handleCalculate,
      loading,
      floatNum,
      setFloatNum,
      expression,
      setExpression,
      a,
      setA,
      b,
      setB,
      x0,
      setX0,
      x1,
      setX1,
      x2,
      setX2,
      tol,
      setTol,
      coeffsStr,
      setCoeffsStr,
      bairstowR,
      setBairstowR,
      bairstowS,
      setBairstowS,
      xPtsStr,
      setXPtsStr,
      yPtsStr,
      setYPtsStr,
      dyPtsStr,
      setDyPtsStr,
      xEval,
      setXEval,
      splineType,
      setSplineType,
      fp0,
      setFp0,
      fpn,
      setFpn,
      hStep,
      setHStep,
      calcPoints,
      setCalcPoints,
      diffFormula,
      setDiffFormula,
      nIntervals,
      setNIntervals,
      levels,
      setLevels,
      matrixStr,
      setMatrixStr,
      vectorBStr,
      setVectorBStr,
      odeExpr,
      setOdeExpr,
      t0,
      setT0,
      y0,
      setY0,
      tf,
      setTf,
      nSteps,
      setNSteps,
    },
  }
}
