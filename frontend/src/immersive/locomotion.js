export function readThumbstick(
  inputSources, handedness, deadZone = 0.18
) {
  const source = Array.from(inputSources ?? []).find(
    item => item.handedness === handedness && item.gamepad
  )

  const gamepad = source?.gamepad
  const axes = gamepad?.axes

  if (!axes) return [0, 0]

  const index = gamepad.mapping === 'xr-standard'
    ? 2 : axes.length === 2 ? 0 : 2

  const rawX = axes[index] ?? 0
  const rawY = axes[index + 1] ?? 0

  if (
    !Number.isFinite(rawX) ||
    !Number.isFinite(rawY)
  ) return [0, 0]

  const magnitude = Math.hypot(rawX, rawY)

  if (magnitude <= deadZone) return [0, 0]

  const strength = Math.min(
    1, (magnitude - deadZone) / (1 - deadZone)
  )

  return [
    rawX / magnitude * strength,
    rawY / magnitude * strength,
  ]
}

export function snapTurn(axis, latched) {
  if (Math.abs(axis) < 0.25) {
    return { angle: 0, latched: false }
  }

  if (latched || Math.abs(axis) < 0.65) {
    return { angle: 0, latched }
  }

  return {
    angle: -Math.sign(axis) * Math.PI / 6,
    latched: true,
  }
}
