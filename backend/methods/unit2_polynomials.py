import cmath
import math
from .unit1_roots import bairstow_method


# ==========================================
# 2. POLINOMIOS Y ACELERACIÓN (5 MÉTODOS)
# ==========================================

def horner_method(coeffs: list, x0: float):
    """
    9. Método de Horner:
    Evalúa P(x0) y P'(x0) mediante división sintética anidada, devolviendo
    los coeficientes del polinomio cociente Q(x) y el residuo P(x0).
    coeffs: [a_n, a_{n-1}, ..., a_0]
    """
    a = [float(c) for c in coeffs]
    n = len(a) - 1
    if n < 0:
        return {"success": False, "error": "Lista de coeficientes vacía"}

    b = [a[0]]  # Coeficientes para P(x0)
    c = [a[0]]  # Coeficientes para P'(x0)

    steps = [{"step": 0, "coeff": a[0], "b_val": round(a[0], 8), "c_val": round(a[0], 8)}]

    for i in range(1, n + 1):
        b_next = a[i] + b[-1] * x0
        b.append(b_next)
        if i < n:
            c_next = b_next + c[-1] * x0
            c.append(c_next)
        else:
            c_next = None

        steps.append({
            "step": i,
            "coeff": a[i],
            "b_val": round(b_next, 8),
            "c_val": round(c_next, 8) if c_next is not None else None,
        })

    px0 = b[-1]
    dpx0 = c[-1] if n >= 1 else 0.0
    quotient_coeffs = b[:-1]

    return {
        "success": True,
        "x0": x0,
        "p_x0": px0,
        "dp_x0": dpx0,
        "quotient_coeffs": quotient_coeffs,
        "steps": steps,
    }


def newton_horner_method(coeffs: list, x0: float, tol: float = 1e-6, max_iter: int = 100):
    """
    10. Método de Newton-Horner:
    Combina la evaluación rápida de P(x) y P'(x) con Horner dentro de Newton-Raphson.
    """
    iterations = []
    x = float(x0)

    for i in range(1, max_iter + 1):
        res = horner_method(coeffs, x)
        if not res["success"]:
            return {"converged": False, "error": res["error"], "iterations": iterations}

        px = res["p_x0"]
        dpx = res["dp_x0"]

        if not all(map(math.isfinite, [px, dpx])):
            return {
                "converged": False,
                "error": "Evaluacion no finita en Newton-Horner",
                "iterations": iterations,
            }

        if px == 0:
            return {
                "converged": True,
                "root": x,
                "deflated_coeffs": res["quotient_coeffs"],
                "iterations": iterations,
            }

        if dpx == 0:
            return {"converged": False, "error": "Derivada igual a cero en Newton-Horner", "iterations": iterations}

        x_next = x - px / dpx
        err = abs((x_next - x) / x_next) * 100 if x_next != 0 else abs(x_next - x)

        iterations.append({
            "iter": i,
            "x_prev": round(x, 8),
            "root_approx": round(x_next, 8),
            "px": round(px, 8),
            "dpx": round(dpx, 8),
            "error_pct": round(err, 6),
        })

        if err < tol:
            final_eval = horner_method(coeffs, x_next)
            return {
                "converged": True,
                "root": x_next,
                "deflated_coeffs": final_eval["quotient_coeffs"],
                "iterations": iterations,
            }
        x = x_next

    return {"converged": False, "error": "Máximo de iteraciones alcanzado", "iterations": iterations}


def polynomial_deflation_method(coeffs: list, x0: float = 0.0, tol: float = 1e-6, max_iter: int = 100):
    """
    11. Deflación polinomial:
    Encuentra todas las raíces reales posibles aplicando Newton-Horner y dividiendo
    sintéticamente el polinomio grado por grado hasta reducirlo a grado 2 o menor.
    """
    current_coeffs = [float(c) for c in coeffs]
    roots_found = []
    deflation_stages = []
    stage = 1

    while len(current_coeffs) - 1 >= 3:
        nh = newton_horner_method(current_coeffs, x0, tol=tol, max_iter=max_iter)
        if not nh["converged"]:
            return {
                "converged": False,
                "error": f"No se encontró raíz real en etapa {stage}: {nh['error']}",
                "roots_found": roots_found,
                "stages": deflation_stages,
            }

        root = nh["root"]
        new_coeffs = nh["deflated_coeffs"]

        roots_found.append({"real": round(root, 8), "imag": 0.0})
        deflation_stages.append({
            "stage": stage,
            "degree": len(current_coeffs) - 1,
            "root": round(root, 8),
            "quotient_coeffs": new_coeffs,
            "iterations": nh["iterations"],
        })

        current_coeffs = new_coeffs
        x0 = root  # Semilla inicial para el polinomio reducido
        stage += 1

    # Resolver el polinomio residual (grado 2 o grado 1) de forma exacta
    deg = len(current_coeffs) - 1
    if deg == 2:
        a, b, c = current_coeffs[0], current_coeffs[1], current_coeffs[2]
        disc = cmath.sqrt(b**2 - 4 * a * c)
        r1 = (-b + disc) / (2 * a)
        r2 = (-b - disc) / (2 * a)
        roots_found.append({"real": round(r1.real, 8), "imag": round(r1.imag, 8)})
        roots_found.append({"real": round(r2.real, 8), "imag": round(r2.imag, 8)})
        deflation_stages.append({
            "stage": stage,
            "degree": 2,
            "note": "Fórmula cuadrática directa sobre polinomio residual",
            "residual_coeffs": [round(x, 8) for x in current_coeffs],
        })
    elif deg == 1:
        a, b = current_coeffs[0], current_coeffs[1]
        r1 = -b / a
        roots_found.append({"real": round(r1, 8), "imag": 0.0})

    return {
        "converged": True,
        "roots": roots_found,
        "stages": deflation_stages,
    }


def aitken_delta2_method(g, x0: float, tol: float = 1e-6, max_iter: int = 100):
    """
    12. Aceleración Delta-cuadrado de Aitken (Δ²):
    Acelera la convergencia de una sucesión de punto fijo x_{n+1} = g(x_n).
    """
    iterations = []
    x = float(x0)

    for i in range(1, max_iter + 1):
        try:
            x1 = float(g(x))
            x2 = float(g(x1))
        except Exception:
            return {"converged": False, "error": "Error al evaluar g(x) en Aitken", "iterations": iterations}

        if not all(map(math.isfinite, [x, x1, x2])):
            return {
                "converged": False,
                "error": "Sucesion no finita",
                "iterations": iterations,
            }

        denom = (x2 - x1) - (x1 - x)

        if x1 == x:
            return {
                "converged": True,
                "root": x,
                "iterations": iterations,
            }

        scale = max(abs(x), abs(x1), abs(x2))

        if abs(denom) <= 4 * math.ulp(scale):
            if x2 == x1:
                return {
                    "converged": True,
                    "root": x2,
                    "iterations": iterations,
                }

            return {
                "converged": False,
                "error": "Denominador nulo o estancamiento sin punto fijo",
                "iterations": iterations,
            }

        x_aitken = x - ((x1 - x) ** 2) / denom

        if not math.isfinite(x_aitken):
            return {
                "converged": False,
                "error": "Divergencia numerica en Aitken",
                "iterations": iterations,
            }
        err = abs((x_aitken - x) / x_aitken) * 100 if x_aitken != 0 else abs(x_aitken - x)

        iterations.append({
            "iter": i,
            "x0": round(x, 8),
            "x1": round(x1, 8),
            "x2": round(x2, 8),
            "root_approx": round(x_aitken, 8),
            "error_pct": round(err, 6),
        })

        if err < tol:
            return {"converged": True, "root": x_aitken, "iterations": iterations}

        x = x_aitken

    return {"converged": False, "error": "Máximo de iteraciones alcanzado", "iterations": iterations}
