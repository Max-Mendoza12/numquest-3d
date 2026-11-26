import numpy as np


def _validate_and_sort_points(x_pts: list, y_pts: list, dy_pts: list = None):
    if len(x_pts) != len(y_pts):
        return None, "x_pts y y_pts deben tener la misma longitud"
    if len(x_pts) < 2:
        return None, "Se requieren al menos 2 puntos para interpolar"
    if len(set(x_pts)) != len(x_pts):
        return None, "Los valores de x no deben repetirse"

    if dy_pts is not None:
        if len(dy_pts) != len(x_pts):
            return None, "dy_pts debe tener la misma longitud que x_pts"
        paired = sorted(zip(x_pts, y_pts, dy_pts), key=lambda p: p[0])
        xs = np.array([float(p[0]) for p in paired], dtype=float)
        ys = np.array([float(p[1]) for p in paired], dtype=float)
        dys = np.array([float(p[2]) for p in paired], dtype=float)
        return (xs, ys, dys), None

    paired = sorted(zip(x_pts, y_pts), key=lambda p: p[0])
    xs = np.array([float(p[0]) for p in paired], dtype=float)
    ys = np.array([float(p[1]) for p in paired], dtype=float)
    return (xs, ys), None


def _sample_curve(eval_fn, x_min: float, x_max: float, num_samples: int = 100):
    grid = np.linspace(x_min, x_max, num_samples)
    return [{"x": round(float(x), 6), "y": round(float(eval_fn(x)), 6)} for x in grid]


# ==========================================
# 14. INTERPOLACIÓN DE VANDERMONDE
# ==========================================
def vandermonde_interpolation(x_pts: list, y_pts: list, x_eval: float):
    data, err = _validate_and_sort_points(x_pts, y_pts)
    if err:
        return {"success": False, "error": err}
    xs, ys = data
    n = len(xs)

    # Matriz de Vandermonde: V[i, j] = x_i^j (de grado 0 a n-1)
    V = np.vander(xs, increasing=True)
    try:
        coeffs_asc = np.linalg.solve(V, ys)  # [a_0, a_1, ..., a_{n-1}]
    except np.linalg.LinAlgError:
        return {"success": False, "error": "Matriz de Vandermonde singular o mal condicionada"}

    def poly_eval(val):
        return sum(c * (val ** j) for j, c in enumerate(coeffs_asc))

    y_eval = float(poly_eval(x_eval))
    coeffs_desc = [round(float(c), 8) for c in reversed(coeffs_asc)]

    return {
        "success": True,
        "x_eval": x_eval,
        "y_eval": round(y_eval, 8),
        "coefficients_desc": coeffs_desc,
        "vandermonde_matrix": [[round(float(v), 6) for v in row] for row in V],
        "curve_points": _sample_curve(poly_eval, xs[0], xs[-1]),
    }


# ==========================================
# 15. INTERPOLACIÓN DE LAGRANGE
# ==========================================
def lagrange_interpolation(x_pts: list, y_pts: list, x_eval: float):
    data, err = _validate_and_sort_points(x_pts, y_pts)
    if err:
        return {"success": False, "error": err}
    xs, ys = data
    n = len(xs)

    def eval_lagrange(val):
        total = 0.0
        for i in range(n):
            li = 1.0
            for j in range(n):
                if i != j:
                    li *= (val - xs[j]) / (xs[i] - xs[j])
            total += ys[i] * li
        return total

    basis_terms = []
    y_eval = 0.0
    for i in range(n):
        li = 1.0
        for j in range(n):
            if i != j:
                li *= (x_eval - xs[j]) / (xs[i] - xs[j])
        term_val = ys[i] * li
        y_eval += term_val
        basis_terms.append({
            "i": i,
            "x_i": round(float(xs[i]), 6),
            "y_i": round(float(ys[i]), 6),
            "L_i_at_x": round(float(li), 8),
            "contribution": round(float(term_val), 8),
        })

    return {
        "success": True,
        "x_eval": x_eval,
        "y_eval": round(float(y_eval), 8),
        "basis_terms": basis_terms,
        "curve_points": _sample_curve(eval_lagrange, xs[0], xs[-1]),
    }


# ==========================================
# 16. MÉTODO DE NEVILLE
# ==========================================
def neville_interpolation(x_pts: list, y_pts: list, x_eval: float):
    data, err = _validate_and_sort_points(x_pts, y_pts)
    if err:
        return {"success": False, "error": err}
    xs, ys = data
    n = len(xs)

    def eval_neville(val):
        Q = np.zeros((n, n), dtype=float)
        Q[:, 0] = ys
        for j in range(1, n):
            for i in range(j, n):
                Q[i, j] = ((val - xs[i - j]) * Q[i, j - 1] - (val - xs[i]) * Q[i - 1, j - 1]) / (xs[i] - xs[i - j])
        return Q[n - 1, n - 1]

    Q = np.zeros((n, n), dtype=float)
    Q[:, 0] = ys
    for j in range(1, n):
        for i in range(j, n):
            Q[i, j] = ((x_eval - xs[i - j]) * Q[i, j - 1] - (x_eval - xs[i]) * Q[i - 1, j - 1]) / (xs[i] - xs[i - j])

    table = []
    for i in range(n):
        row = [round(float(Q[i, j]), 8) if j <= i else None for j in range(n)]
        table.append({"i": i, "x_i": round(float(xs[i]), 6), "values": row})

    return {
        "success": True,
        "x_eval": x_eval,
        "y_eval": round(float(Q[n - 1, n - 1]), 8),
        "neville_table": table,
        "curve_points": _sample_curve(eval_neville, xs[0], xs[-1]),
    }


# ==========================================
# 17. DIFERENCIAS DIVIDIDAS DE NEWTON
# ==========================================
def divided_differences_interpolation(x_pts: list, y_pts: list, x_eval: float):
    data, err = _validate_and_sort_points(x_pts, y_pts)
    if err:
        return {"success": False, "error": err}
    xs, ys = data
    n = len(xs)

    dd = np.zeros((n, n), dtype=float)
    dd[:, 0] = ys
    for j in range(1, n):
        for i in range(n - j):
            dd[i, j] = (dd[i + 1, j - 1] - dd[i, j - 1]) / (xs[i + j] - xs[i])

    newton_coeffs = dd[0, :]

    def eval_newton(val):
        result = newton_coeffs[0]
        prod = 1.0
        for j in range(1, n):
            prod *= (val - xs[j - 1])
            result += newton_coeffs[j] * prod
        return result

    table = []
    for i in range(n):
        row = [round(float(dd[i, j]), 8) if j < n - i else None for j in range(n)]
        table.append({"i": i, "x_i": round(float(xs[i]), 6), "differences": row})

    return {
        "success": True,
        "x_eval": x_eval,
        "y_eval": round(float(eval_newton(x_eval)), 8),
        "newton_coefficients": [round(float(c), 8) for c in newton_coeffs],
        "divided_diff_table": table,
        "curve_points": _sample_curve(eval_newton, xs[0], xs[-1]),
    }


# ==========================================
# 18. INTERPOLACIÓN DE HERMITE
# ==========================================
def hermite_interpolation(x_pts: list, y_pts: list, dy_pts: list, x_eval: float):
    data, err = _validate_and_sort_points(x_pts, y_pts, dy_pts)
    if err:
        return {"success": False, "error": err}
    xs, ys, dys = data
    n = len(xs)
    m = 2 * n

    z = np.zeros(m, dtype=float)
    Q = np.zeros((m, m), dtype=float)

    for i in range(n):
        z[2 * i] = xs[i]
        z[2 * i + 1] = xs[i]
        Q[2 * i, 0] = ys[i]
        Q[2 * i + 1, 0] = ys[i]
        Q[2 * i + 1, 1] = dys[i]
        if i > 0:
            Q[2 * i, 1] = (Q[2 * i, 0] - Q[2 * i - 1, 0]) / (z[2 * i] - z[2 * i - 1])

    for j in range(2, m):
        for i in range(j, m):
            Q[i, j] = (Q[i, j - 1] - Q[i - 1, j - 1]) / (z[i] - z[i - j])

    hermite_coeffs = np.diag(Q)

    def eval_hermite(val):
        result = hermite_coeffs[0]
        prod = 1.0
        for j in range(1, m):
            prod *= (val - z[j - 1])
            result += hermite_coeffs[j] * prod
        return result

    return {
        "success": True,
        "x_eval": x_eval,
        "y_eval": round(float(eval_hermite(x_eval)), 8),
        "hermite_coefficients": [round(float(c), 8) for c in hermite_coeffs],
        "curve_points": _sample_curve(eval_hermite, xs[0], xs[-1]),
    }


# ==========================================
# 19. SPLINES CÚBICOS (NATURAL Y SUJETO)
# ==========================================
def cubic_spline_interpolation(
    x_pts: list,
    y_pts: list,
    x_eval: float,
    boundary_type: str = "natural",
    fp0: float = 0.0,
    fpn: float = 0.0,
):
    """
    boundary_type: 'natural' (S''(x_0) = S''(x_n) = 0) o 'clamped' / 'sujeto' (S'(x_0) = fp0, S'(x_n) = fpn)
    Cada tramo i en [x_i, x_{i+1}] tiene forma:
    S_i(x) = a_i + b_i*(x - x_i) + c_i*(x - x_i)^2 + d_i*(x - x_i)^3
    """
    data, err = _validate_and_sort_points(x_pts, y_pts)
    if err:
        return {"success": False, "error": err}
    xs, ys = data
    n = len(xs) - 1  # Número de subintervalos
    h = np.diff(xs)

    A = np.zeros((n + 1, n + 1), dtype=float)
    rhs = np.zeros(n + 1, dtype=float)

    for i in range(1, n):
        A[i, i - 1] = h[i - 1]
        A[i, i] = 2.0 * (h[i - 1] + h[i])
        A[i, i + 1] = h[i]
        rhs[i] = 3.0 * ((ys[i + 1] - ys[i]) / h[i] - (ys[i] - ys[i - 1]) / h[i - 1])

    b_type = boundary_type.strip().lower()
    if b_type in ("clamped", "sujeto"):
        A[0, 0] = 2.0 * h[0]
        A[0, 1] = h[0]
        rhs[0] = 3.0 * ((ys[1] - ys[0]) / h[0] - fp0)

        A[n, n - 1] = h[n - 1]
        A[n, n] = 2.0 * h[n - 1]
        rhs[n] = 3.0 * (fpn - (ys[n] - ys[n - 1]) / h[n - 1])
        applied_type = "sujeto"
    else:
        A[0, 0] = 1.0
        A[n, n] = 1.0
        applied_type = "natural"

    c = np.linalg.solve(A, rhs)
    a = ys[:-1].copy()
    b = np.zeros(n, dtype=float)
    d = np.zeros(n, dtype=float)

    segments = []
    for i in range(n):
        b[i] = (ys[i + 1] - ys[i]) / h[i] - (h[i] / 3.0) * (2.0 * c[i] + c[i + 1])
        d[i] = (c[i + 1] - c[i]) / (3.0 * h[i])
        segments.append({
            "segment": i,
            "interval": [round(float(xs[i]), 6), round(float(xs[i + 1]), 6)],
            "a": round(float(a[i]), 8),
            "b": round(float(b[i]), 8),
            "c": round(float(c[i]), 8),
            "d": round(float(d[i]), 8),
        })

    def eval_spline(val):
        if val <= xs[0]:
            idx = 0
        elif val >= xs[-1]:
            idx = n - 1
        else:
            idx = int(np.searchsorted(xs, val) - 1)
            idx = max(0, min(idx, n - 1))
        dx = val - xs[idx]
        return a[idx] + b[idx] * dx + c[idx] * (dx ** 2) + d[idx] * (dx ** 3)

    return {
        "success": True,
        "boundary_type": applied_type,
        "x_eval": x_eval,
        "y_eval": round(float(eval_spline(x_eval)), 8),
        "segments": segments,
        "curve_points": _sample_curve(eval_spline, xs[0], xs[-1]),
    }