import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

import SpatialButton from '../xr/SpatialButton.jsx'
import SpatialPanel from '../xr/SpatialPanel.jsx'

import {
  VR_FAMILIES,
  getVRMethod,
  makeDraft,
  validateDraft,
  editValue,
  cycleIndex,
} from './immersiveMethods.js'

const KEYS = [
  '7', '8', '9', '/', '(', ')',
  '4', '5', '6', '*', 'x', '^',
  '1', '2', '3', '-', 't', 'y',
  '0', '.', ',', '+', 'e', 'pi',
  'sin(', 'cos(', 'exp(', 'sqrt(', 'log(', 'abs(',
  '\n', 'backspace', 'clear',
]

const KEY_LABELS = {
  '\n': 'Fila',
  backspace: '⌫',
  clear: 'Limpiar',
}

function acceptsKey(type, key) {
  if (key === 'clear' || key === 'backspace') return true

  if (type === 'expr') {
    return key !== '\n'
  }

  if (/^[0-9.+-]$/.test(key) || key === 'e') return true

  if (key === ',') {
    return type === 'list' || type === 'matrix'
  }

  return type === 'matrix' && key === '\n'
}

function Caption({
  children,
  position,
  color = '#e2e8f0',
  size = 0.034,
  width = 1.16,
}) {
  return (
    <Text
      position={position}
      color={color}
      fontSize={size}
      maxWidth={width}
      textAlign="center"
      renderOrder={1003}
      material-depthTest={false}
      material-depthWrite={false}
      raycast={() => null}
    >
      {children}
    </Text>
  )
}

function Selector({
  y, label, previous, next, disabled,
}) {
  return (
    <group position={[0, y, 0.035]}>
      <SpatialButton
          overlay
        position={[-0.55, 0, 0]}
        width={0.13}
        height={0.075}
        label="‹"
        disabled={disabled}
        onClick={previous}
      />

      <Caption
        position={[0, 0, 0.02]}
        width={0.96}
      >
        {label}
      </Caption>

      <SpatialButton
          overlay
        position={[0.55, 0, 0]}
        width={0.13}
        height={0.075}
        label="›"
        disabled={disabled}
        onClick={next}
      />
    </group>
  )
}

function Calculator({
  formState, loading, onCalculate, onClose,
}) {
  const [draft, setDraft] = useState(() =>
    makeDraft(formState?.method, formState)
  )

  const [fieldIndex, setFieldIndex] = useState(0)
  const [error, setError] = useState('')

  const spec = getVRMethod(draft.method)

  const familyIndex = VR_FAMILIES.findIndex(
    family => family.methods.some(
      item => item.id === draft.method
    )
  )

  const family = VR_FAMILIES[familyIndex]
  const methodIndex = family.methods.findIndex(
    item => item.id === draft.method
  )

  const field = spec.fields[fieldIndex]
  const value = draft.values[field.key]

  function selectMethod(id) {
    setDraft(makeDraft(id))
    setFieldIndex(0)
    setError('')
  }

  function changeFamily(delta) {
    const index = cycleIndex(
      familyIndex, delta, VR_FAMILIES.length
    )

    selectMethod(VR_FAMILIES[index].methods[0].id)
  }

  function changeMethod(delta) {
    const index = cycleIndex(
      methodIndex, delta, family.methods.length
    )

    selectMethod(family.methods[index].id)
  }

  function changeField(delta) {
    setFieldIndex(index => cycleIndex(
      index, delta, spec.fields.length
    ))

    setError('')
  }

  function insert(key) {
    setDraft(previous => ({
      ...previous,
      values: {
        ...previous.values,
        [field.key]: editValue(
          previous.values[field.key], key
        ),
      },
    }))

    setError('')
  }

  function calculate() {
    const validated = validateDraft(draft)

    if (validated.error) {
      setError(validated.error)
      return
    }

    onCalculate(validated.preset)
    onClose()
  }

  const display = value.replaceAll('\n', ' | ')

  return (
    <SpatialPanel
        overlay
      position={[0, 0.76, 0]}
      width={1.36}
      height={1.22}
      title="NumQuest · Calculadora espacial"
    >
      <Selector
        y={0.43}
        label={`Familia: ${family.label}`}
        previous={() => changeFamily(-1)}
        next={() => changeFamily(1)}
        disabled={loading}
      />

      <Selector
        y={0.33}
        label={spec.label}
        previous={() => changeMethod(-1)}
        next={() => changeMethod(1)}
        disabled={loading}
      />

      <Selector
        y={0.23}
        label={`${field.label} · ${fieldIndex + 1}/${spec.fields.length}`}
        previous={() => changeField(-1)}
        next={() => changeField(1)}
        disabled={loading}
      />

      <mesh position={[0, 0.115, 0.02]} renderOrder={1002}>
        <planeGeometry args={[1.22, 0.105]} />
        <meshBasicMaterial
          color="#081321"
          transparent
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      <Caption
        position={[0, 0.115, 0.04]}
        color="#67e8f9"
        size={0.035}
      >
        {display.length > 68
          ? `…${display.slice(-68)}`
          : display || 'Campo vacío'}
      </Caption>

      {KEYS.map((key, i) => (
        <SpatialButton
          overlay
          key={key}
          position={[
            (i % 6 - 2.5) * 0.208,
            0.025 - Math.floor(i / 6) * 0.068,
            0.035,
          ]}
          width={0.195}
          height={0.058}
          label={KEY_LABELS[key] ?? key}
          disabled={loading || !acceptsKey(field.type, key)}
          onClick={() => insert(key)}
        />
      ))}

      <Caption
        position={[0, -0.402, 0.045]}
        color={error ? '#fca5a5' : '#94a3b8'}
        size={0.027}
      >
        {error || 'Selecciona un campo para editarlo'}
      </Caption>

      <SpatialButton
          overlay
        position={[-0.43, -0.515, 0.035]}
        label="Restaurar"
        width={0.35}
        height={0.09}
        disabled={loading}
        onClick={() => selectMethod(draft.method)}
      />

      <SpatialButton
          overlay
        position={[0, -0.515, 0.035]}
        label={loading ? 'Calculando' : 'Calcular'}
        width={0.43}
        height={0.09}
        color="#14534b"
        disabled={loading}
        onClick={calculate}
      />

      <SpatialButton
          overlay
        position={[0.45, -0.515, 0.035]}
        label="Cerrar"
        width={0.35}
        height={0.09}
        onClick={onClose}
      />
    </SpatialPanel>
  )
}

export default function ImmersiveControls({
  formState,
  methodLabel,
  summary,
  stepLabel,
  step,
  total,
  playing,
  loading,
  errorMsg,
  onSeek,
  onToggle,
  onCalculate,
  onRecenter,
  onExit,
  immersive,
}) {
  const anchor = useRef(null)
  const [open, setOpen] = useState(false)

  useFrame(({ camera, gl }) => {
    const group = anchor.current

    if (!group) return

    const view = gl.xr.isPresenting
      ? gl.xr.getCamera()
      : camera

    group.position.setFromMatrixPosition(
      view.matrixWorld
    )

    group.quaternion.setFromRotationMatrix(
      view.matrixWorld
    )

    group.translateZ(-2.05)
    group.translateY(-0.45)
  })

  const controls = [
    {
      label: open ? 'Cerrar' : 'Menú',
      action: () => setOpen(value => !value),
      disabled: false,
    },
    {
      label: '‹',
      action: () => onSeek(step - 1),
      disabled: total === 0 || step === 0,
    },
    {
      label: playing ? 'Pausa' : 'Play',
      action: onToggle,
      disabled: total <= 1,
    },
    {
      label: '›',
      action: () => onSeek(step + 1),
      disabled: total === 0 || step >= total - 1,
    },
    {
      label: 'Inicio',
      action: onRecenter,
      disabled: !immersive,
    },
    {
      label: 'Salir VR',
      action: onExit,
      disabled: !immersive,
    },
  ]

  return (
    <group ref={anchor}>
      <SpatialPanel
        overlay
        position={[0, 0, 0]}
        width={1.36}
        height={0.32}
      >
        <Caption
          position={[0, 0.107, 0.04]}
          color="#a5b4fc"
          size={0.027}
        >
          {methodLabel || 'NumQuest Immersive'}
        </Caption>

        <Caption
          position={[0, 0.045, 0.04]}
          color={errorMsg ? '#fca5a5' : '#6ee7b7'}
          size={0.032}
        >
          {loading
            ? 'Calculando...'
            : errorMsg
              ? String(errorMsg).slice(0, 100)
              : summary}
        </Caption>

        <Caption
          position={[0, -0.016, 0.04]}
          color="#94a3b8"
          size={0.023}
        >
          {stepLabel || 'Abre el menú para calcular'}
        </Caption>

        {controls.map((control, i) => (
          <SpatialButton
          overlay
            key={i}
            position={[
              (i - 2.5) * 0.208,
              -0.105,
              0.035,
            ]}
            label={control.label}
            width={0.195}
            height={0.073}
            disabled={control.disabled}
            onClick={control.action}
          />
        ))}
      </SpatialPanel>

      {open && (
        <Calculator
          formState={formState}
          loading={loading}
          onCalculate={onCalculate}
          onClose={() => setOpen(false)}
        />
      )}
    </group>
  )
}
