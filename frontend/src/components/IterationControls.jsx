export default function IterationControls({
  plot,
  step,
  onChange,
  playing,
  onToggle,
}) {
  const total = plot.steps.length
  const current = plot.steps[step]

  return (
    <section className="lab-panel iteration-panel">
      <div className="iteration-heading">
        <div>
          <span className="lab-eyebrow">Procedimiento</span>
          <h3>Iteración {step + 1} de {total}</h3>
        </div>
        <strong>{current.next_x.toFixed(8)}</strong>
      </div>

      <input
        aria-label="Seleccionar iteración"
        type="range"
        min={0}
        max={total - 1}
        value={step}
        onChange={event => onChange(Number(event.target.value))}
      />

      <div className="iteration-actions">
        <button
          disabled={step === 0}
          onClick={() => onChange(step - 1)}
        >
          ‹ Anterior
        </button>

        <button disabled={total <= 1} onClick={onToggle}>
          {playing ? 'Pausar' : 'Reproducir'}
        </button>

        <button onClick={() => onChange(0)}>
          Reiniciar
        </button>

        <button
          disabled={step === total - 1}
          onClick={() => onChange(step + 1)}
        >
          Siguiente ›
        </button>
      </div>
    </section>
  )
}
