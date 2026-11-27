export default function IterationControls({
  plot,
  step,
  onChange,
  playing,
  onToggle,
}) {
  const total = plot.steps.length
  const current = plot.steps[step]
  const interpolation = ['lagrange', 'neville'].includes(plot.kind)
  const integration = ['trapezoid', 'simpson_1_3', 'simpson_3_8'].includes(plot.kind)
  const linear = plot.kind === 'linear_system'
  const ode = plot.kind === 'ode'
  const supplemental = plot.kind === 'supplemental'
  const hasValue = interpolation || integration || ode

  return (
    <section className="lab-panel iteration-panel">
      <div className="iteration-heading">
        <div>
          <span className="lab-eyebrow">Procedimiento</span>
          <h3>
            {hasValue || linear || supplemental ? current.label : 'Iteración'}
            {' · '}{step + 1} de {total}
          </h3>
        </div>
        <strong>{linear
          ? 'Matriz 3×4'
          : supplemental
            ? current.valueLabel
            : (hasValue ? current.value : current.next_x).toFixed(8)
        }</strong>
      </div>

      {linear && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            fontSize: '0.85rem',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            borderCollapse: 'collapse',
          }}>
            <thead>
              <tr>
                {['X', 'Y', 'Z', 'b'].map(name => (
                  <th key={name} style={{ padding: '5px' }}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.matrix.map((row, i) => (
                <tr key={i}>
                  {row.map((value, j) => (
                    <td key={j} style={{
                      padding: '5px',
                      borderLeft: j === 3
                        ? '1px solid #64748b' : undefined,
                      color: j === 3 ? '#67e8f9' : undefined,
                    }}>
                      {Number(value.toPrecision(7))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {current.pivot_row !== null && (
            <p style={{
              fontSize: '0.8rem',
              color: '#a5b4c8',
            }}>
              {`Fila pivote: ${current.pivot_row}`}
              {current.swapped && ' · Intercambio de filas'}
            </p>
          )}

          <p style={{ fontSize: '0.8rem', color: '#6ee7b7' }}>
            {`Solución: (${plot.solution.map(
              value => Number(value.toPrecision(7))
            ).join(', ')})`}
          </p>
        </div>
      )}

      {ode && (
        <div style={{
          fontSize: '0.8rem',
          color: '#a5b4c8',
          lineHeight: 1.7,
        }}>
          <div>
            {`t: ${Number(current.start[0].toPrecision(6))}`}
            {' → '}
            {Number(current.end[0].toPrecision(6))}
            {' · h = '}{Number(current.h.toPrecision(6))}
          </div>

          <div>
            {current.stages.map(stage =>
              `${stage.label} = ${Number(stage.slope.toPrecision(7))}`
            ).join(' · ')}
          </div>

          {current.derivative !== undefined && (
            <div>
              {`Derivada total: ${Number(current.derivative.toPrecision(7))}`}
            </div>
          )}

          <div style={{ color: '#6ee7b7' }}>
            {`y final ≈ ${plot.final_y.toFixed(8)}`}
          </div>
        </div>
      )}

      {integration && (
        <div style={{ fontSize: '0.8rem', color: '#a5b4c8' }}>
          {`Intervalo [${Number(current.a.toPrecision(5))}, ${Number(current.b.toPrecision(5))}]`}
          {' · Aporte: '}{current.contribution.toFixed(8)}
          {' · Integral acumulada'}
        </div>
      )}

      {interpolation && (
        <div style={{ fontSize: '0.8rem', color: '#a5b4c8' }}>
          {plot.kind === 'lagrange'
            ? `Suma acumulada · Aporte: ${current.contribution.toFixed(8)}`
            : 'Valor de la última fila para el orden seleccionado'}
          {plot.extrapolation && ' · Extrapolación'}
        </div>
      )}

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
