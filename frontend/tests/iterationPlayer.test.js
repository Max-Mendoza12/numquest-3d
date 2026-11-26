import test from 'node:test'
import assert from 'node:assert/strict'
import {
  playerState,
  transitionPlayer,
} from '../src/hooks/useIterationPlayer.js'

const plot = { steps: [{}, {}, {}] }

test('Estado inicial', () => {
  const state = playerState(null, plot)
  assert.equal(state.step, 0)
  assert.equal(state.playing, false)
})

test('Limites de navegacion', () => {
  const state = transitionPlayer(null, plot, {
    type: 'seek', step: 100,
  })
  assert.equal(state.step, 2)
})

test('Reproduccion y avance', () => {
  const playing = transitionPlayer(null, plot, {
    type: 'toggle',
  })

  assert.equal(playing.playing, true)

  const next = transitionPlayer(playing, plot, {
    type: 'tick',
  })

  assert.equal(next.step, 1)
})

test('Detencion al finalizar', () => {
  const state = transitionPlayer(
    { plot, step: 1, playing: true },
    plot,
    { type: 'tick' }
  )

  assert.equal(state.step, 2)
  assert.equal(state.playing, false)
})

test('Reinicio al reproducir desde el final', () => {
  const state = transitionPlayer(
    { plot, step: 2, playing: false },
    plot,
    { type: 'toggle' }
  )

  assert.equal(state.step, 0)
  assert.equal(state.playing, true)
})

test('Cambio de resultado', () => {
  const nextPlot = { steps: [{}] }

  const state = playerState(
    { plot, step: 2, playing: true },
    nextPlot
  )

  assert.equal(state.step, 0)
  assert.equal(state.playing, false)
})

test('Navegacion manual pausa la reproduccion', () => {
  const state = transitionPlayer(
    { plot, step: 1, playing: true },
    plot,
    { type: 'seek', step: 0 }
  )

  assert.equal(state.step, 0)
  assert.equal(state.playing, false)
})
