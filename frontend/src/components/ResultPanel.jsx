export default function ResultPanel({ result }) {
  return (
    <>
        {/* TARJETA DE RESULTADO DESTACADO */}
        {result && (
          <div className="result-card">
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Resultado Obtenido
            </span>
            <div className="result-highlight">
              {result.root !== undefined && typeof result.root === 'number' && `Raíz: ${result.root.toFixed(8)}`}
              {result.root !== undefined && typeof result.root === 'object' && `Raíz: ${result.root.real} + ${result.root.imag}i`}
              {result.roots && `Raíces: ${result.roots.map((r) => `${r.real}${r.imag ? ` + ${r.imag}i` : ''}`).join(' | ')}`}
              {result.p_x0 !== undefined && `P(${result.x0}) = ${result.p_x0} | P'(${result.x0}) = ${result.dp_x0}`}
              {result.y_eval !== undefined && `P(${result.x_eval}) = ${result.y_eval}`}
              {result.derivative !== undefined && `f'(${result.x0}) = ${result.derivative}`}
              {result.integral !== undefined && `Integral ≈ ${result.integral}`}
              {result.solution && `x = [${result.solution.join(', ')}]`}
              {result.final_y !== undefined && `y(${result.final_t}) = ${result.final_y}`}
              {result.ieee754_32 && `32-bit: ${result.ieee754_32.binary}`}
            </div>
          </div>
        )}

        {/* TABLA RESUMIDA DE ITERACIONES O PASOS */}
        {result?.iterations?.length > 0 && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Aproximación</th>
                  <th>Error %</th>
                </tr>
              </thead>
              <tbody>
                {result.iterations.map((it) => (
                  <tr key={it.iter}>
                    <td>{it.iter}</td>
                    <td style={{ color: '#34d399' }}>
                      {it.root_approx !== undefined ? it.root_approx : it.x_real !== undefined ? `${it.x_real}+${it.x_imag}i` : `r=${it.r}`}
                    </td>
                    <td>{it.error_pct ?? it.error_r_pct ?? 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  )
}
