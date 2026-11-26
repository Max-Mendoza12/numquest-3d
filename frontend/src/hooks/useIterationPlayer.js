import { useState, useEffect } from 'react'

export function playerState(state, plot) {
  return state?.plot === plot
    ? state
    : { plot, step: 0, playing: false }
}

export function transitionPlayer(state, plot, action) {
  const current = playerState(state, plot)
  const last = Math.max(0, (plot?.steps?.length ?? 1) - 1)

  if (action.type === 'seek') {
    return {
      plot,
      step: Math.max(0, Math.min(last, action.step)),
      playing: false,
    }
  }

  if (action.type === 'toggle') {
    if (last === 0) return current

    return {
      plot,
      step: current.step === last ? 0 : current.step,
      playing: !current.playing,
    }
  }

  if (action.type === 'tick' && current.playing) {
    const step = Math.min(last, current.step + 1)

    return {
      plot,
      step,
      playing: step < last,
    }
  }

  return current
}

export function useIterationPlayer(plot) {
  const [state, setState] = useState(null)

  const { step, playing } = playerState(state, plot)

  function seek(value) {
    setState(previous => transitionPlayer(
      previous, plot, { type: 'seek', step: value }
    ))
  }

  function toggle() {
    setState(previous => transitionPlayer(
      previous, plot, { type: 'toggle' }
    ))
  }

  useEffect(() => {
    if (!plot || !playing) return

    const timer = setInterval(() => {
      setState(previous => transitionPlayer(
        previous, plot, { type: 'tick' }
      ))
    }, 1200)

    return () => clearInterval(timer)
  }, [plot, playing])

  return { step, playing, seek, toggle }
}
