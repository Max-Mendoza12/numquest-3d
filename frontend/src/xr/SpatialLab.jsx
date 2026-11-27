import { useState } from 'react'
import { Text } from '@react-three/drei'
import { useXR } from '@react-three/xr'
import { NewtonPlot } from '../scenes/NewtonPlot.jsx'
import SpatialButton from './SpatialButton.jsx'
import SpatialPanel from './SpatialPanel.jsx'

const EXAMPLES = [
  {
    label: 'Newton · Cúbico',
    method: 'newton',
    expression: 'x^3-2*x-5',
    x0: 2,
  },
  {
    label: 'Newton · Cuadrático',
    method: 'newton',
    expression: 'x^2-2',
    x0: 1.5,
  },
  {
    label: 'Newton · Trigonométrico',
    method: 'newton',
    expression: 'cos(x)-x',
    x0: 1,
  },
  {
    label: 'Bisección',
    method: 'bisection',
    expression: 'x^2-2',
    a: 1,
    b: 2,
  },
  {
    label: 'Secante',
    method: 'secant',
    expression: 'x^2-2',
    x0: 1,
    x1: 2,
  },
]

const INTERPOLATION_EXAMPLES = [
  {
    label: 'Lagrange',
    method: 'lagrange',
    xPtsStr: '0, 1, 2, 3',
    yPtsStr: '0, 1, 4, 9',
    xEval: 1.5,
  },
  {
    label: 'Neville',
    method: 'neville',
    xPtsStr: '0, 1, 2, 3',
    yPtsStr: '0, 1, 4, 9',
    xEval: 1.5,
  },
]

const INTEGRATION_METHODS = [
  'trapezoid', 'simpson_1_3', 'simpson_3_8',
]

const INTEGRATION_EXAMPLES = [
  {
    label: 'Trapecio',
    method: 'trapezoid',
  },
  {
    label: 'Simpson 1/3',
    method: 'simpson_1_3',
  },
  {
    label: 'Simpson 3/8',
    method: 'simpson_3_8',
  },
].map(example => ({
  ...example,
  categoryId: 'calculus',
  expression: 'x^2',
  a: 0,
  b: 3,
  nIntervals: 6,
}))

const ODE_EXAMPLES = [
  { label: 'Euler', method: 'euler' },
  { label: 'Taylor 2', method: 'taylor2' },
  { label: 'Euler modificado', method: 'modified_euler' },
  { label: 'Punto medio', method: 'midpoint' },
  { label: 'Runge-Kutta 4', method: 'rk4' },
].map(example => ({
  ...example,
  categoryId: 'ode',
  odeExpr: 'y',
  t0: 0,
  y0: 1,
  tf: 1,
  nSteps: 5,
}))

const FAMILIES = [
  { id: 'roots', label: 'Raíces', examples: EXAMPLES },
  { id: 'interpolation', label: 'Interpolación', examples: INTERPOLATION_EXAMPLES },
  { id: 'integration', label: 'Integración', examples: INTEGRATION_EXAMPLES },
  { id: 'ode', label: 'EDO', examples: ODE_EXAMPLES },
]

function Label({ children, position, color = '#e2e8f0', size = 0.032, width = 0.48 }) {
  return (
    <Text
      position={position}
      fontSize={size}
      color={color}
      maxWidth={width}
      textAlign="center"
      raycast={() => null}
    >
      {children}
    </Text>
  )
}

function number(value) {
  return Number.isFinite(value)
    ? Number(value.toPrecision(9)).toString()
    : '—'
}

export default function SpatialLab({
  plot,
  step,
  playing,
  onSeek,
  onToggle,
  onLoadExample,
  loading,
  errorMsg,
}) {
  const session = useXR(state => state.session)
  const [scale, setScale] = useState(1)
  const [family, setFamily] = useState(
    plot?.kind === 'ode'
      ? 'ode'
      : INTEGRATION_METHODS.includes(plot?.kind)
      ? 'integration'
      : ['lagrange', 'neville'].includes(plot?.kind)
        ? 'interpolation' : 'roots'
  )

  const familyIndex = FAMILIES.findIndex(item => item.id === family)
  const familyConfig = FAMILIES[familyIndex]
  const nextFamily = FAMILIES[(familyIndex + 1) % FAMILIES.length]
  const examples = familyConfig.examples

  const total = plot?.steps?.length ?? 0
  const current = plot?.steps?.[step]
  const isBisection = plot?.kind === 'bisection'
  const isSecant = plot?.kind === 'secant'
  const isInterpolation = ['lagrange', 'neville'].includes(plot?.kind)
  const isIntegration = INTEGRATION_METHODS.includes(plot?.kind)
  const isODE = plot?.kind === 'ode'

  const formula = isBisection
    ? 'c = (a + b) / 2'
    : isSecant
      ? 'x2 = x1 - f(x1) / pendiente'
      : "x siguiente = x - f(x) / f'(x)"

  return (
    <group position={[0, 1.4, -2.25]} scale={scale}>

      {/* Encabezado */}
      <SpatialPanel position={[0, 0.66, 0]} width={1.48} height={0.16}>
        <Label position={[0, 0.025, 0.03]} size={0.061} width={1.4} color="#22d3ee">
          NumQuest Spatial Lab
        </Label>
        <Label position={[0, -0.043, 0.03]} width={1.4} size={0.026}>
          Laboratorio matemático en realidad mixta
        </Label>
      </SpatialPanel>

      {/* Biblioteca de ejemplos */}
      <SpatialPanel
        position={[-1.04, 0, 0.12]}
        rotation={[0, 0.18, 0]}
        width={0.53}
        height={1.02}
        title={familyConfig.label}
      >
        {examples.map((example, index) => (
          <SpatialButton
            key={example.label}
            label={example.label}
            position={[0, 0.32 - index * 0.10, 0.035]}
            width={0.45}
            color={
              (isODE
                ? plot.method === example.method &&
                  plot.expression === example.odeExpr
                : plot?.kind === example.method &&
                  plot?.expression === example.expression)
                ? '#155e75' : '#203b54'
            }
            disabled={loading}
            onClick={() => onLoadExample(example)}
          />
        ))}

        <SpatialButton
          label={`Ver ${nextFamily.label}`}
          position={[0, -0.20, 0.035]}
          width={0.45}
          color="#514080"
          disabled={loading}
          onClick={() => setFamily(nextFamily.id)}
        />

        <SpatialButton
          label="Reducir"
          position={[-0.115, -0.33, 0.035]}
          width={0.21}
          disabled={scale <= 0.8}
          onClick={() => setScale(v => Math.max(0.8, v - 0.1))}
        />

        <SpatialButton
          label="Ampliar"
          position={[0.115, -0.33, 0.035]}
          width={0.21}
          disabled={scale >= 1.2}
          onClick={() => setScale(v => Math.min(1.2, v + 0.1))}
        />

        <SpatialButton
          label="Restaurar tamaño"
          position={[0, -0.445, 0.035]}
          width={0.45}
          onClick={() => setScale(1)}
        />
      </SpatialPanel>

      {/* Grafica central */}
      <SpatialPanel position={[0, 0, 0]} width={1.48} height={1.02}>
        {current ? (
          <group position={[0, 0, 0.065]} scale={0.21}>
            <NewtonPlot plot={plot} step={step} width={5.9} />
          </group>
        ) : (
          <>
            <Label position={[0, 0.30, 0.04]} size={0.06} width={1.3} color="#22d3ee">
              Laboratorio matemático
            </Label>
            <Label position={[0, 0.04, 0.04]} size={0.043} width={1.25}>
              {loading ? 'Calculando...' : 'Selecciona un ejemplo del panel izquierdo.'}
            </Label>
          </>
        )}
      </SpatialPanel>

      {/* Inspector matematico */}
      <SpatialPanel
        position={[1.08, 0, 0.12]}
        rotation={[0, -0.18, 0]}
        width={0.60}
        height={1.02}
        title="Proceso y resultado"
      >
        {current && isODE ? (
          <>
            <Label position={[0, 0.33, 0.04]} color="#94a3b8">
              Solución numérica
            </Label>

            <Label position={[0, 0.24, 0.04]}
              color="#34d399" size={0.05}>
              {number(plot.final_y)}
            </Label>

            <Label position={[0, 0.13, 0.04]}>
              {`Paso ${step + 1} de ${total}`}
            </Label>

            <Label position={[0, 0.04, 0.04]}>
              {`t = ${number(current.end[0])}`}
            </Label>

            {current.stages.map((stage, i) => (
              <Label
                key={stage.label}
                position={[0, -0.05 - i * 0.075, 0.04]}
                color="#fbbf24"
              >
                {`${stage.label} = ${number(stage.slope)}`}
              </Label>
            ))}

            <Label position={[0, -0.38, 0.04]}
              color="#6ee7b7">
              {`y siguiente = ${number(current.value)}`}
            </Label>
          </>
        ) : current && isIntegration ? (
          <>
            <Label position={[0, 0.33, 0.04]} color="#94a3b8">
              Integral aproximada
            </Label>

            <Label
              position={[0, 0.24, 0.04]}
              color="#34d399"
              size={0.054}
            >
              {number(plot.integral)}
            </Label>

            <Label position={[0, 0.12, 0.04]} color="#a78bfa">
              {`Bloque ${step + 1} de ${total}`}
            </Label>

            <Label position={[0, 0.015, 0.04]}>
              {`[${number(current.a)}, ${number(current.b)}]`}
            </Label>

            <Label position={[0, -0.09, 0.04]}>
              Aporte del bloque
            </Label>

            <Label
              position={[0, -0.16, 0.04]}
              color="#fbbf24"
              size={0.043}
            >
              {number(current.contribution)}
            </Label>

            <Label position={[0, -0.26, 0.04]}>
              Integral acumulada
            </Label>

            <Label
              position={[0, -0.36, 0.04]}
              color="#34d399"
              size={0.043}
            >
              {number(current.value)}
            </Label>

            <Label
              position={[0, -0.44, 0.04]}
              color="#94a3b8"
              size={0.024}
            >
              Suma de áreas con signo
            </Label>
          </>
        ) : current && isInterpolation ? (
          <>
            <Label position={[0, 0.33, 0.04]} color="#94a3b8">
              {plot.extrapolation ? 'Valor extrapolado' : 'Valor interpolado'}
            </Label>

            <Label
              position={[0, 0.24, 0.04]}
              color="#34d399"
              size={0.054}
            >
              {number(plot.evaluation[1])}
            </Label>

            <Label position={[0, 0.12, 0.04]}>
              {`Evaluado en x = ${number(plot.evaluation[0])}`}
            </Label>

            <Label position={[0, 0.015, 0.04]} color="#a78bfa">
              {`${current.label} · ${step + 1}/${total}`}
            </Label>

            <Label position={[0, -0.09, 0.04]}>
              {plot.kind === 'lagrange'
                ? 'Suma acumulada'
                : 'Última fila de Neville'}
            </Label>

            <Label position={[0, -0.17, 0.04]} color="#fbbf24" size={0.048}>
              {number(current.value)}
            </Label>

            <Label position={[0, -0.28, 0.04]}>
              {plot.kind === 'lagrange'
                ? `Aporte: ${number(current.contribution)}`
                : `Nodos: ${current.node_indices.length}`}
            </Label>

            <Label position={[0, -0.39, 0.04]} color="#a78bfa">
              {plot.kind === 'lagrange'
                ? 'P(x) = suma de y_i * L_i(x)'
                : 'Interpolación por orden creciente'}
            </Label>
          </>
        ) : current ? (
          <>
            <Label position={[0, 0.33, 0.04]} color="#94a3b8">
              {plot.converged ? 'Raíz calculada' : 'Última aproximación'}
            </Label>

            <Label
              position={[0, 0.25, 0.04]}
              color={plot.converged ? '#34d399' : '#fbbf24'}
              size={0.054}
              width={0.54}
            >
              {number(plot.root ?? plot.steps.at(-1).next_x)}
            </Label>

            <Label position={[0, 0.12, 0.04]} color="#a78bfa">
              {`Iteración ${step + 1} de ${total}`}
            </Label>

            <Label position={[0, 0.015, 0.04]}>
              {isBisection
                ? `a = ${number(current.a)}`
                : isSecant
                  ? `x0 = ${number(current.previous_x)}`
                  : `x actual = ${number(current.x)}`}
            </Label>

            <Label position={[0, -0.065, 0.04]}>
              {isBisection
                ? `b = ${number(current.b)}`
                : isSecant
                  ? `x1 = ${number(current.x)}`
                  : `f(x) = ${number(current.fx)}`}
            </Label>

            <Label position={[0, -0.145, 0.04]}>
              {isBisection
                ? `f(c) = ${number(current.fx)}`
                : `Pendiente = ${number(current.slope)}`}
            </Label>

            <Label position={[0, -0.225, 0.04]} color="#fbbf24">
              {`${isBisection ? 'c' : 'x siguiente'} = ${number(current.next_x)}`}
            </Label>

            <Label position={[0, -0.36, 0.04]} color="#a78bfa">
              {formula}
            </Label>
          </>
        ) : (
          <Label position={[0, 0.15, 0.04]} color="#94a3b8">
            Esperando cálculo
          </Label>
        )}

        {errorMsg && (
          <Label
            position={[0, -0.45, 0.04]}
            size={0.025}
            width={0.55}
            color="#f87171"
          >
            {String(errorMsg).slice(0, 100)}
          </Label>
        )}
      </SpatialPanel>

      {/* Controles de reproduccion */}
      <SpatialPanel position={[0, -0.66, 0.04]} width={2.12} height={0.17}>
        <SpatialButton
          position={[-0.83, 0, 0.035]}
          label="Anterior"
          disabled={!current || step === 0}
          onClick={() => onSeek(step - 1)}
        />

        <SpatialButton
          position={[-0.42, 0, 0.035]}
          label={playing ? 'Pausar' : 'Reproducir'}
          color="#14534b"
          disabled={total <= 1}
          onClick={onToggle}
        />

        <SpatialButton
          position={[0, 0, 0.035]}
          label="Siguiente"
          disabled={!current || step >= total - 1}
          onClick={() => onSeek(step + 1)}
        />

        <SpatialButton
          position={[0.42, 0, 0.035]}
          label="Reiniciar"
          disabled={!current}
          onClick={() => onSeek(0)}
        />

        <SpatialButton
          position={[0.83, 0, 0.035]}
          label="Salir AR"
          onClick={() => session?.end()}
        />
      </SpatialPanel>
    </group>
  )
}
