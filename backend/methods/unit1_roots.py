import struct
import math
import cmath
import numpy as np

# ==========================================
# 1.1 ARITMÉTICA DE PUNTO FLOTANTE (IEEE 754)
# ==========================================
def analyze_float(number: float):
    packed32 = struct.pack(">f", number)
    bits32 = "".join(f"{b:08b}" for b in packed32)

    packed64 = struct.pack(">d", number)
    bits64 = "".join(f"{b:08b}" for b in packed64)

    return {
        "input": number,
        "ieee754_32": {
            "sign": bits32[0],
            "exponent": bits32[1:9],
            "mantissa": bits32[9:],
            "binary": f"{bits32[0]} | {bits32[1:9]} | {bits32[9:]}",
        },
        "ieee754_64": {
            "sign": bits64[0],
            "exponent": bits64[1:12],
            "mantissa": bits64[12:],
            "binary": f"{bits64[0]} | {bits64[1:12]} | {bits64[12:]}",
        },
        "machine_epsilon_64": float(np.finfo(np.float64).eps),
        "machine_epsilon_32": float(np.finfo(np.float32).eps),
    }


# ==========================================
# 1.2 MÉTODOS CERRADOS (2)
# ==========================================
def bisection_method(f, a: float, b: float, tol: float = 1e-6, max_iter: int = 100):
    fa, fb = float(f(a)), float(f(b))

    if not all(map(math.isfinite, [a, b, fa, fb])):
        return {
            "converged": False,
            "error": "Intervalo o evaluaciones no finitas",
            "iterations": [],
        }

    if fa == 0:
        return {"converged": True, "root": a, "iterations": []}

    if fb == 0:
        return {"converged": True, "root": b, "iterations": []}

    if (fa < 0) == (fb < 0):
        return {"converged": False, "error": "f(a) y f(b) deben tener signos opuestos", "iterations": []}


    initial_scale = min(abs(fa), abs(fb))
    iterations = []
    c_old = a
    for i in range(1, max_iter + 1):
        c = (a + b) / 2.0
        try:
            fc = float(f(c))
        except (ArithmeticError, ValueError, TypeError):
            return {
                "converged": False,
                "error": "Funcion no definida dentro del intervalo",
                "iterations": iterations,
            }

        if not math.isfinite(fc):
            return {
                "converged": False,
                "error": "Evaluacion no finita",
                "iterations": iterations,
            }
        err = abs((c - c_old) / c) * 100 if (i > 1 and c != 0) else 100.0

        iterations.append({
            "iter": i,
            "a": round(a, 8),
            "b": round(b, 8),
            "root_approx": round(c, 8),
            "fx": round(fc, 8),
            "geometry": {
                "a": a,
                "b": b,
                "fa": fa,
                "fb": fb,
                "x": c,
                "fx": fc,
                "next_x": c,
            },
            "error_pct": round(err, 6),
        })

        residual = abs(fc) / initial_scale

        x_tolerance = (
            tol / 100.0 * max(abs(c), 1.0)
        )

        interval_ok = (
            abs(b - a) / 2.0 <= x_tolerance
        )

        residual_ok = residual <= tol / 100.0

        if fc == 0 or (interval_ok and residual_ok):
            return {"converged": True, "root": c, "iterations": iterations}

        if c == a or c == b:
            return {
                "converged": False,
                "error": (
                    "Estancamiento sin residuo suficiente; "
                    "posible discontinuidad"
                ),
                "iterations": iterations,
            }

        if (fa < 0) != (fc < 0):
            b, fb = c, fc
        else:
            a, fa = c, fc
        c_old = c

    return {"converged": False, "error": "Máximo de iteraciones alcanzado", "iterations": iterations}


def false_position_method(f, a: float, b: float, tol: float = 1e-6, max_iter: int = 100):
    fa, fb = float(f(a)), float(f(b))

    if not all(map(math.isfinite, [a, b, fa, fb])):
        return {
            "converged": False,
            "error": "Intervalo o evaluaciones no finitas",
            "iterations": [],
        }

    if fa == 0:
        return {"converged": True, "root": a, "iterations": []}

    if fb == 0:
        return {"converged": True, "root": b, "iterations": []}

    if (fa < 0) == (fb < 0):
        return {"converged": False, "error": "f(a) y f(b) deben tener signos opuestos", "iterations": []}

    initial_scale = max(abs(fa), abs(fb))

    iterations = []
    c_old = a
    for i in range(1, max_iter + 1):
        scale = max(abs(fa), abs(fb))
        wa = abs(fa) / scale
        wb = abs(fb) / scale
        c = a + (b - a) * (wa / (wa + wb))
        fc = float(f(c))

        if not math.isfinite(fc):
            return {
                "converged": False,
                "error": "Evaluacion no finita",
                "iterations": iterations,
            }
        err = abs((c - c_old) / c) * 100 if (i > 1 and c != 0) else 100.0

        iterations.append({
            "iter": i,
            "a": round(a, 8),
            "b": round(b, 8),
            "root_approx": round(c, 8),
            "fx": round(fc, 8),
            "error_pct": round(err, 6),
        })

        residual = abs(fc) / initial_scale

        if fc == 0 or (
            i > 1 and err < tol
            and residual <= tol / 100.0
        ):
            return {"converged": True, "root": c, "iterations": iterations}

        if (fa < 0) != (fc < 0):
            b, fb = c, fc
        else:
            a, fa = c, fc
        c_old = c

    return {"converged": False, "error": "Máximo de iteraciones alcanzado", "iterations": iterations}


# ==========================================
# 1.3 MÉTODOS ABIERTOS (6)
# ==========================================
def fixed_point_method(g, x0: float, tol: float = 1e-6, max_iter: int = 100):
    iterations = []
    x = float(x0)
    for i in range(1, max_iter + 1):
        try:
            x_next = float(g(x))
        except Exception:
            return {"converged": False, "error": "Divergencia numérica en g(x)", "iterations": iterations}

        if abs(x_next) > 1e12:
            return {"converged": False, "error": "El método diverge hacia infinito", "iterations": iterations}

        err = abs((x_next - x) / x_next) * 100 if x_next != 0 else abs(x_next - x)
        iterations.append({
            "iter": i,
            "x_prev": round(x, 8),
            "root_approx": round(x_next, 8),
            "error_pct": round(err, 6),
        })

        if err < tol:
            return {"converged": True, "root": x_next, "iterations": iterations}
        x = x_next

    return {"converged": False, "error": "Máximo de iteraciones alcanzado", "iterations": iterations}


def newton_raphson_method(f, df, x0: float, tol: float = 1e-6, max_iter: int = 100):
    iterations = []
    x = float(x0)
    for i in range(1, max_iter + 1):
        fx = float(f(x))

        if fx == 0:
            return {
                "converged": True,
                "root": x,
                "iterations": iterations,
            }

        dfx = float(df(x))

        if not all(map(math.isfinite, [fx, dfx])):
            return {
                "converged": False,
                "error": "Evaluacion no finita en Newton",
                "iterations": iterations,
            }

        if dfx == 0:
            return {"converged": False, "error": "Derivada igual a cero (tangente horizontal)", "iterations": iterations}

        x_next = x - fx / dfx
        err = abs((x_next - x) / x_next) * 100 if x_next != 0 else abs(x_next - x)

        iterations.append({
            "iter": i,
            "x_prev": round(x, 8),
            "root_approx": round(x_next, 8),
            "fx": round(float(f(x_next)), 8),
            "dfx": round(dfx, 8),
            "geometry": {
                "x": x,
                "fx": fx,
                "slope": dfx,
                "next_x": x_next,
            },
            "error_pct": round(err, 6),
        })

        if err < tol:
            return {"converged": True, "root": x_next, "iterations": iterations}
        x = x_next

    return {"converged": False, "error": "Máximo de iteraciones alcanzado", "iterations": iterations}


def newton_multiple_roots_method(f, df, d2f, x0: float, tol: float = 1e-6, max_iter: int = 100):
    """
    Newton-Raphson modificado para raíces múltiples:
    x_{i+1} = x_i - [f(x_i) * f'(x_i)] / [(f'(x_i))^2 - f(x_i) * f''(x_i)]
    """
    iterations = []
    x = float(x0)
    for i in range(1, max_iter + 1):
        fx = float(f(x))

        if fx == 0.0:
            return {
                "converged": True,
                "root": x,
                "iterations": iterations,
            }

        dfx = float(df(x))

        if dfx == 0.0:
            return {
                "converged": False,
                "error": "Punto estacionario que no es una raiz",
                "iterations": iterations,
            }

        d2fx = float(d2f(x))

        if not all(map(math.isfinite, [fx, dfx, d2fx])):
            return {
                "converged": False,
                "error": "Evaluaciones no finitas",
                "iterations": iterations,
            }

        scale = max(abs(fx), abs(dfx), abs(d2fx))

        fn = fx / scale
        dn = dfx / scale
        d2n = d2fx / scale

        first = dn * dn
        second = fn * d2n
        denom = first - second

        cancellation_limit = 8 * math.ulp(
            max(abs(first), abs(second))
        )

        if abs(denom) <= cancellation_limit:
            return {
                "converged": False,
                "error": "Denominador numericamente singular",
                "iterations": iterations,
            }

        x_next = x - (fn * dn) / denom

        if not math.isfinite(x_next):
            return {
                "converged": False,
                "error": "Aproximacion no finita",
                "iterations": iterations,
            }
        err = abs((x_next - x) / x_next) * 100 if x_next != 0 else abs(x_next - x)

        iterations.append({
            "iter": i,
            "x_prev": round(x, 8),
            "root_approx": round(x_next, 8),
            "fx": round(float(f(x_next)), 8),
            "dfx": round(dfx, 8),
            "d2fx": round(d2fx, 8),
            "error_pct": round(err, 6),
        })

        if float(f(x_next)) == 0.0:
            return {
                "converged": True,
                "root": x_next,
                "iterations": iterations,
            }

        if x_next == x:
            return {
                "converged": False,
                "error": "Estancamiento numerico sin encontrar una raiz exacta",
                "iterations": iterations,
            }

        if err < tol:
            return {
                "converged": True,
                "root": x_next,
                "iterations": iterations,
            }
        x = x_next

    return {"converged": False, "error": "Máximo de iteraciones alcanzado", "iterations": iterations}


def secant_method(f, x0: float, x1: float, tol: float = 1e-6, max_iter: int = 100):
    iterations = []
    x0, x1 = float(x0), float(x1)
    for i in range(1, max_iter + 1):
        fx0, fx1 = float(f(x0)), float(f(x1))

        if not all(map(math.isfinite, [fx0, fx1])):
            return {
                "converged": False,
                "error": "Evaluacion no finita en Secante",
                "iterations": iterations,
            }

        if fx1 == 0:
            return {
                "converged": True,
                "root": x1,
                "iterations": iterations,
            }

        if fx0 == 0:
            return {
                "converged": True,
                "root": x0,
                "iterations": iterations,
            }

        if fx1 == fx0:
            return {"converged": False, "error": "División por cero: f(x1) - f(x0) = 0", "iterations": iterations}

        x2 = x1 - fx1 * (x1 - x0) / (fx1 - fx0)
        err = abs((x2 - x1) / x2) * 100 if x2 != 0 else abs(x2 - x1)

        iterations.append({
            "iter": i,
            "x0": round(x0, 8),
            "x1": round(x1, 8),
            "root_approx": round(x2, 8),
            "fx": round(float(f(x2)), 8),
            "geometry": {
                "previous_x": x0,
                "previous_fx": fx0,
                "x": x1,
                "fx": fx1,
                "slope": (fx1 - fx0) / (x1 - x0),
                "next_x": x2,
            },
            "error_pct": round(err, 6),
        })

        if err < tol:
            return {"converged": True, "root": x2, "iterations": iterations}
        x0, x1 = x1, x2

    return {"converged": False, "error": "Máximo de iteraciones alcanzado", "iterations": iterations}


def steffensen_method(f, x0: float, tol: float = 1e-6, max_iter: int = 100):
    """
    Método de Steffensen (aceleración cuadrática sin derivadas):
    x_{i+1} = x_i - [f(x_i)]^2 / [f(x_i + f(x_i)) - f(x_i)]
    """
    iterations = []
    x = float(x0)
    scale = None
    for i in range(1, max_iter + 1):
        raw_fx = float(f(x))

        if not math.isfinite(raw_fx):
            return {
                "converged": False,
                "error": "Evaluacion no finita",
                "iterations": iterations,
            }

        if raw_fx == 0:
            fx = raw_fx
            iterations.append({
                "iter": i,
                "x_prev": round(x, 8),
                "root_approx": round(x, 8),
                "fx": round(fx, 8),
                "error_pct": 0.0,
            })
            return {"converged": True, "root": x, "iterations": iterations}

        if scale is None:
            magnitude = abs(raw_fx)

            scale = (
                magnitude
                if magnitude < 1e-8 or magnitude > 1e8
                else 1.0
            )

        fx = raw_fx / scale

        try:
            fx_plus = float(f(x + fx)) / scale
        except Exception:
            return {"converged": False, "error": "Divergencia numérica al evaluar f(x + f(x))", "iterations": iterations}

        denom = fx_plus - fx

        if not math.isfinite(denom) or denom == 0:
            return {"converged": False, "error": "División por cero en Steffensen", "iterations": iterations}

        x_next = x - fx * (fx / denom)

        if not math.isfinite(x_next):
            return {
                "converged": False,
                "error": "Aproximacion no finita",
                "iterations": iterations,
            }
        if abs(x_next) > 1e12:
            return {"converged": False, "error": "El método diverge hacia infinito", "iterations": iterations}

        err = abs((x_next - x) / x_next) * 100 if x_next != 0 else abs(x_next - x)

        iterations.append({
            "iter": i,
            "x_prev": round(x, 8),
            "root_approx": round(x_next, 8),
            "fx": round(float(f(x_next)), 8),
            "error_pct": round(err, 6),
        })

        if err < tol:
            return {"converged": True, "root": x_next, "iterations": iterations}
        x = x_next

    return {"converged": False, "error": "Máximo de iteraciones alcanzado", "iterations": iterations}


def muller_method(f, x0: float, x1: float, x2: float, tol: float = 1e-6, max_iter: int = 100):
    iterations = []
    x0, x1, x2 = complex(x0), complex(x1), complex(x2)

    for i in range(1, max_iter + 1):
        h1 = x1 - x0
        h2 = x2 - x1
        d1 = (f(x1) - f(x0)) / h1
        d2 = (f(x2) - f(x1)) / h2

        a = (d2 - d1) / (h2 + h1)
        b = a * h2 + d2
        c = f(x2)

        disc = cmath.sqrt(b**2 - 4 * a * c)
        denom = b + disc if abs(b + disc) > abs(b - disc) else b - disc

        if denom == 0:
            return {"converged": False, "error": "División por cero en denominador", "iterations": iterations}

        dx = -2 * c / denom
        x3 = x2 + dx
        err = abs(dx / x3) * 100 if x3 != 0 else abs(dx)

        iterations.append({
            "iter": i,
            "x_real": round(x3.real, 8),
            "x_imag": round(x3.imag, 8),
            "fx_abs": round(abs(f(x3)), 8),
            "error_pct": round(err, 6),
        })

        if abs(dx) < tol:
            return {
                "converged": True,
                "root": {"real": round(x3.real, 8), "imag": round(x3.imag, 8)},
                "iterations": iterations,
            }

        x0, x1, x2 = x1, x2, x3

    return {"converged": False, "error": "Máximo de iteraciones alcanzado", "iterations": iterations}


def bairstow_method(coeffs: list, r: float = -1.0, s: float = -1.0, tol: float = 1e-6, max_iter: int = 100):
    a = list(reversed([float(c) for c in coeffs]))
    n = len(a) - 1
    if n < 2:
        return {"converged": False, "error": "El polinomio debe ser al menos de grado 2", "iterations": []}

    if a[n] == 0.0:
        return {
            "converged": False,
            "error": "El coeficiente principal no puede ser cero",
            "iterations": [],
        }

    if n == 2:
        r = -a[1] / a[2]
        s = -a[0] / a[2]

        disc = cmath.sqrt(r**2 + 4 * s)
        x1 = (r + disc) / 2.0
        x2 = (r - disc) / 2.0

        return {
            "converged": True,
            "quadratic_factor": (
                f"x^2 - ({round(r, 6)})x - ({round(s, 6)})"
            ),
            "roots": [
                {
                    "real": round(x1.real, 8),
                    "imag": round(x1.imag, 8),
                },
                {
                    "real": round(x2.real, 8),
                    "imag": round(x2.imag, 8),
                },
            ],
            "iterations": [],
        }

    iterations = []
    for it in range(1, max_iter + 1):
        b = [0.0] * (n + 1)
        c = [0.0] * (n + 1)

        b[n] = a[n]
        b[n - 1] = a[n - 1] + r * b[n]
        for i in range(n - 2, -1, -1):
            b[i] = a[i] + r * b[i + 1] + s * b[i + 2]

        c[n] = b[n]
        c[n - 1] = b[n - 1] + r * c[n]
        for i in range(n - 2, 0, -1):
            c[i] = b[i] + r * c[i + 1] + s * c[i + 2]

        det = c[2] * c[2] - c[3] * c[1]
        if abs(det) < 1e-14:
            r += 0.1
            s += 0.1
            continue

        dr = (-b[1] * c[2] + b[0] * c[3]) / det
        ds = (-b[0] * c[2] + b[1] * c[1]) / det

        r += dr
        s += ds

        err_r = abs(dr / r) * 100 if r != 0 else abs(dr)
        err_s = abs(ds / s) * 100 if s != 0 else abs(ds)

        iterations.append({
            "iter": it,
            "r": round(r, 8),
            "s": round(s, 8),
            "error_r_pct": round(err_r, 6),
            "error_s_pct": round(err_s, 6),
        })

        if err_r < tol and err_s < tol:
            disc = cmath.sqrt(r**2 + 4 * s)
            x1 = (r + disc) / 2.0
            x2 = (r - disc) / 2.0
            return {
                "converged": True,
                "quadratic_factor": f"x^2 - ({round(r, 6)})x - ({round(s, 6)})",
                "roots": [
                    {"real": round(x1.real, 8), "imag": round(x1.imag, 8)},
                    {"real": round(x2.real, 8), "imag": round(x2.imag, 8)},
                ],
                "iterations": iterations,
            }

    return {"converged": False, "error": "Máximo de iteraciones alcanzado", "iterations": iterations}
