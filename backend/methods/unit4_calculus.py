import numpy as np


# ==========================================
# 20. DERIVACIÓN NUMÉRICA (2, 3 Y 5 PUNTOS)
# ==========================================
def numerical_differentiation(f, x0: float, h: float = 1e-3, points: int = 3, formula: str = "centered"):
    """
    Calcula f'(x0) usando diferencias finitas de 2, 3 o 5 puntos.
    - points=2: formula in ('forward', 'backward')
    - points=3: formula in ('centered', 'forward_endpoint', 'backward_endpoint')
    - points=5: formula in ('centered', 'forward_endpoint', 'backward_endpoint')
    """
    if h == 0:
        return {"success": False, "error": "El tamaño de paso h no puede ser cero"}

    x0, h = float(x0), float(h)
    f_type = formula.strip().lower()
    nodes = []

    if points == 2:
        if f_type == "backward":
            deriv = (f(x0) - f(x0 - h)) / h
            used = "2 puntos regresiva (O(h))"
            pts = [x0 - h, x0]
        else:
            deriv = (f(x0 + h) - f(x0)) / h
            used = "2 puntos progresiva (O(h))"
            pts = [x0, x0 + h]

    elif points == 3:
        if f_type == "forward_endpoint":
            deriv = (-3.0 * f(x0) + 4.0 * f(x0 + h) - f(x0 + 2 * h)) / (2.0 * h)
            used = "3 puntos extremo progresiva (O(h²))"
            pts = [x0, x0 + h, x0 + 2 * h]
        elif f_type == "backward_endpoint":
            deriv = (3.0 * f(x0) - 4.0 * f(x0 - h) + f(x0 - 2 * h)) / (2.0 * h)
            used = "3 puntos extremo regresiva (O(h²))"
            pts = [x0 - 2 * h, x0 - h, x0]
        else:
            deriv = (f(x0 + h) - f(x0 - h)) / (2.0 * h)
            used = "3 puntos centrada (O(h²))"
            pts = [x0 - h, x0, x0 + h]

    elif points == 5:
        if f_type == "forward_endpoint":
            deriv = (-25.0 * f(x0) + 48.0 * f(x0 + h) - 36.0 * f(x0 + 2 * h) + 16.0 * f(x0 + 3 * h) - 3.0 * f(x0 + 4 * h)) / (12.0 * h)
            used = "5 puntos extremo progresiva (O(h⁴))"
            pts = [x0 + k * h for k in range(5)]
        elif f_type == "backward_endpoint":
            deriv = (25.0 * f(x0) - 48.0 * f(x0 - h) + 36.0 * f(x0 - 2 * h) - 16.0 * f(x0 - 3 * h) + 3.0 * f(x0 - 4 * h)) / (12.0 * h)
            used = "5 puntos extremo regresiva (O(h⁴))"
            pts = [x0 - k * h for k in range(4, -1, -1)]
        else:
            deriv = (f(x0 - 2 * h) - 8.0 * f(x0 - h) + 8.0 * f(x0 + h) - f(x0 + 2 * h)) / (12.0 * h)
            used = "5 puntos centrada (O(h⁴))"
            pts = [x0 - 2 * h, x0 - h, x0, x0 + h, x0 + 2 * h]
    else:
        return {"success": False, "error": "Solo se admiten fórmulas de 2, 3 o 5 puntos"}

    nodes = [{"x": round(float(px), 8), "fx": round(float(f(px)), 8)} for px in pts]

    return {
        "success": True,
        "formula_used": used,
        "x0": x0,
        "h": h,
        "derivative": round(float(deriv), 10),
        "fx0": round(float(f(x0)), 8),
        "evaluated_nodes": nodes,
    }


# ==========================================
# 21. EXTRAPOLACIÓN DE RICHARDSON
# ==========================================
def richardson_extrapolation(f, x0: float, h: float = 0.1, levels: int = 4):
    """
    Aplica extrapolación de Richardson sobre diferencias centradas de orden O(h²):
    D_{i, 0} = [f(x0 + h/2^i) - f(x0 - h/2^i)] / (2 * h/2^i)
    D_{i, j} = D_{i, j-1} + (D_{i, j-1} - D_{i-1, j-1}) / (4^j - 1)
    """
    if levels < 1 or levels > 10:
        return {"success": False, "error": "levels debe estar entre 1 y 10"}
    if h == 0:
        return {"success": False, "error": "h no puede ser cero"}

    D = np.zeros((levels, levels), dtype=float)
    steps = []

    for i in range(levels):
        hi = h / (2.0 ** i)
        steps.append(hi)
        D[i, 0] = (f(x0 + hi) - f(x0 - hi)) / (2.0 * hi)

    for j in range(1, levels):
        factor = (4.0 ** j) - 1.0
        for i in range(j, levels):
            D[i, j] = D[i, j - 1] + (D[i, j - 1] - D[i - 1, j - 1]) / factor

    table = []
    for i in range(levels):
        row = [round(float(D[i, j]), 10) if j <= i else None for j in range(levels)]
        table.append({"level": i, "h": round(steps[i], 10), "values": row})

    return {
        "success": True,
        "x0": x0,
        "derivative": round(float(D[levels - 1, levels - 1]), 10),
        "richardson_table": table,
    }


# ==========================================
# 22. REGLA DEL TRAPECIO (COMPUESTA)
# ==========================================
def trapezoidal_rule(f, a: float, b: float, n: int = 10):
    if n < 1:
        return {"success": False, "error": "El número de subintervalos n debe ser al menos 1"}

    a, b = float(a), float(b)
    h = (b - a) / n
    xs = np.linspace(a, b, n + 1)
    ys = np.array([float(f(x)) for x in xs], dtype=float)

    integral = (h / 2.0) * (ys[0] + 2.0 * np.sum(ys[1:-1]) + ys[-1])
    nodes = [{"x": round(float(xs[i]), 6), "y": round(float(ys[i]), 6)} for i in range(n + 1)]

    return {
        "success": True,
        "method": "Trapecio compuesto",
        "a": a,
        "b": b,
        "n": n,
        "h": round(h, 8),
        "integral": round(float(integral), 10),
        "nodes": nodes,
    }


# ==========================================
# 23. REGLA DE SIMPSON 1/3 (COMPUESTA)
# ==========================================
def simpson_1_3_rule(f, a: float, b: float, n: int = 10):
    if n < 2 or n % 2 != 0:
        return {"success": False, "error": "Simpson 1/3 requiere un número par de subintervalos (n >= 2)"}

    a, b = float(a), float(b)
    h = (b - a) / n
    xs = np.linspace(a, b, n + 1)
    ys = np.array([float(f(x)) for x in xs], dtype=float)

    odd_sum = np.sum(ys[1:-1:2])
    even_sum = np.sum(ys[2:-1:2])
    integral = (h / 3.0) * (ys[0] + 4.0 * odd_sum + 2.0 * even_sum + ys[-1])
    nodes = [{"x": round(float(xs[i]), 6), "y": round(float(ys[i]), 6)} for i in range(n + 1)]

    return {
        "success": True,
        "method": "Simpson 1/3 compuesto",
        "a": a,
        "b": b,
        "n": n,
        "h": round(h, 8),
        "integral": round(float(integral), 10),
        "nodes": nodes,
    }


# ==========================================
# 24. REGLA DE SIMPSON 3/8 (COMPUESTA)
# ==========================================
def simpson_3_8_rule(f, a: float, b: float, n: int = 9):
    if n < 3 or n % 3 != 0:
        return {"success": False, "error": "Simpson 3/8 requiere que n sea múltiplo de 3 (n >= 3)"}

    a, b = float(a), float(b)
    h = (b - a) / n
    xs = np.linspace(a, b, n + 1)
    ys = np.array([float(f(x)) for x in xs], dtype=float)

    sum_mult3 = 0.0
    sum_other = 0.0
    for i in range(1, n):
        if i % 3 == 0:
            sum_mult3 += ys[i]
        else:
            sum_other += ys[i]

    integral = (3.0 * h / 8.0) * (ys[0] + 3.0 * sum_other + 2.0 * sum_mult3 + ys[-1])
    nodes = [{"x": round(float(xs[i]), 6), "y": round(float(ys[i]), 6)} for i in range(n + 1)]

    return {
        "success": True,
        "method": "Simpson 3/8 compuesto",
        "a": a,
        "b": b,
        "n": n,
        "h": round(h, 8),
        "integral": round(float(integral), 10),
        "nodes": nodes,
    }


# ==========================================
# 25. INTEGRACIÓN DE ROMBERG
# ==========================================
def romberg_integration(f, a: float, b: float, max_levels: int = 5, tol: float = 1e-8):
    if max_levels < 1 or max_levels > 10:
        return {"success": False, "error": "max_levels debe estar entre 1 y 10"}

    a, b = float(a), float(b)
    R = np.zeros((max_levels, max_levels), dtype=float)
    h = b - a
    R[0, 0] = 0.5 * h * (float(f(a)) + float(f(b)))

    rows_completed = 1
    for i in range(1, max_levels):
        h /= 2.0
        # Suma de los nuevos puntos medios
        sub_sum = sum(float(f(a + (2 * k - 1) * h)) for k in range(1, 2 ** (i - 1) + 1))
        R[i, 0] = 0.5 * R[i - 1, 0] + h * sub_sum

        for j in range(1, i + 1):
            R[i, j] = R[i, j - 1] + (R[i, j - 1] - R[i - 1, j - 1]) / ((4.0 ** j) - 1.0)

        rows_completed = i + 1
        if abs(R[i, i] - R[i - 1, i - 1]) < tol:
            break

    table = []
    for i in range(rows_completed):
        row = [round(float(R[i, j]), 10) if j <= i else None for j in range(rows_completed)]
        table.append({"level": i, "subintervals": 2 ** i, "values": row})

    best_val = float(R[rows_completed - 1, rows_completed - 1])
    return {
        "success": True,
        "method": "Integración de Romberg",
        "a": a,
        "b": b,
        "integral": round(best_val, 10),
        "romberg_table": table,
    }


# ==========================================
# 26. CUADRATURA ADAPTATIVA (SIMPSON ADAPTATIVO)
# ==========================================
def adaptive_quadrature(f, a: float, b: float, tol: float = 1e-6, max_depth: int = 20):
    a, b = float(a), float(b)
    subintervals = []

    def simpson_single(x0, x1):
        xm = 0.5 * (x0 + x1)
        return ((x1 - x0) / 6.0) * (float(f(x0)) + 4.0 * float(f(xm)) + float(f(x1)))

    def recurse(x0, x1, eps, whole, depth):
        xm = 0.5 * (x0 + x1)
        left = simpson_single(x0, xm)
        right = simpson_single(xm, x1)
        delta = left + right - whole

        if depth <= 0 or abs(delta) <= 15.0 * eps:
            val = left + right + delta / 15.0
            subintervals.append({
                "a": round(x0, 6),
                "b": round(x1, 6),
                "area": round(float(val), 8),
            })
            return val

        return (
            recurse(x0, xm, eps / 2.0, left, depth - 1)
            + recurse(xm, x1, eps / 2.0, right, depth - 1)
        )

    initial_whole = simpson_single(a, b)
    total_integral = recurse(a, b, tol, initial_whole, max_depth)

    return {
        "success": True,
        "method": "Cuadratura adaptativa (Simpson)",
        "a": a,
        "b": b,
        "tolerance": tol,
        "integral": round(float(total_integral), 10),
        "subintervals_count": len(subintervals),
        "subintervals": subintervals,
    }


# ==========================================
# 27. CUADRATURA GAUSSIANA (GAUSS-LEGENDRE)
# ==========================================
def gaussian_quadrature(f, a: float, b: float, n_points: int = 3):
    """
    Cuadratura de Gauss-Legendre para n_points en {2, 3, 4, 5}.
    Transforma el intervalo [a, b] a [-1, 1] mediante x = ((b-a)*t + (a+b))/2.
    """
    if n_points not in (2, 3, 4, 5):
        return {"success": False, "error": "n_points debe ser 2, 3, 4 o 5"}

    a, b = float(a), float(b)
    t_nodes, weights = np.polynomial.legendre.leggauss(n_points)

    half_len = 0.5 * (b - a)
    mid = 0.5 * (a + b)

    integral = 0.0
    eval_details = []
    for t, w in zip(t_nodes, weights):
        x_mapped = half_len * float(t) + mid
        fx = float(f(x_mapped))
        integral += float(w) * fx
        eval_details.append({
            "t_node": round(float(t), 8),
            "weight": round(float(w), 8),
            "x_mapped": round(x_mapped, 8),
            "fx": round(fx, 8),
        })

    integral *= half_len

    return {
        "success": True,
        "method": f"Cuadratura Gauss-Legendre ({n_points} puntos)",
        "a": a,
        "b": b,
        "n_points": n_points,
        "integral": round(float(integral), 10),
        "gauss_nodes": eval_details,
    }