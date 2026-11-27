import numpy as np
import sympy as sp
from core.parser import parse_math_expression
from core.ode_plot import (
    MAX_PLOT_STEPS,
    make_ode_step,
    build_ode_plot,
)


# ==========================================
# 28. ELIMINACIÓN GAUSSIANA (TRIVIAL, PARCIAL Y ESCALADO)
# ==========================================
def gaussian_elimination(A_matrix: list, b_vector: list, pivoting: str = "partial"):
    """
    Resuelve el sistema lineal A * x = b mediante Eliminación Gaussiana.
    pivoting:
      - 'trivial' : sin intercambio de filas (solo falla si el pivote es 0)
      - 'partial' : pivoteo parcial (mayor valor absoluto en la columna)
      - 'scaled'  : pivoteo parcial escalado (max |a_{ik}| / s_i)
    """
    A = np.array(A_matrix, dtype=float)
    b = np.array(b_vector, dtype=float)

    if A.ndim != 2 or A.shape[0] != A.shape[1]:
        return {"success": False, "error": "La matriz A debe ser cuadrada (n x n)"}
    n = A.shape[0]

    if n == 0:
        return {
            "success": False,
            "error": "La matriz no puede estar vacia",
        }

    if b.ndim != 1 or b.shape[0] != n:
        return {"success": False, "error": "El vector b debe tener dimensión n"}

    if not np.all(np.isfinite(A)) or not np.all(np.isfinite(b)):
        return {
            "success": False,
            "error": "El sistema contiene valores no finitos",
        }

    M = np.hstack([A, b.reshape(-1, 1)])
    mode = pivoting.strip().lower()

    if mode not in ("trivial", "partial", "scaled"):
        return {
            "success": False,
            "error": "Modo de pivoteo invalido",
        }
    steps = []

    # Datos geometricos independientes del resultado redondeado.
    plot_steps = []

    if n == 3:
        plot_steps.append({
            "label": "Sistema original",
            "matrix": M.tolist(),
            "pivot_row": None,
            "swapped": False,
        })

    # Factores de escala por fila (para pivoteo escalado)
    scale_factors = np.max(np.abs(A), axis=1)
    if np.any(scale_factors == 0):
        return {"success": False, "error": "Fila nula detectada; el sistema es singular"}

    relative_threshold = (
        np.finfo(float).eps * max(n, 1)
    )

    def invalid_pivot(row, column):
        pivot = abs(M[row, column])
        scale = scale_factors[row]

        return (
            not np.isfinite(pivot)
            or pivot / scale <= relative_threshold
        )

    for k in range(n - 1):
        pivot_row = k

        if mode == "partial":
            pivot_row = k + int(np.argmax(np.abs(M[k:, k])))
        elif mode == "scaled":
            ratios = np.abs(M[k:, k]) / scale_factors[k:]
            pivot_row = k + int(np.argmax(ratios))
        elif mode == "trivial":
            pivot_row = k
        else:
            return {"success": False, "error": "Modo de pivoteo inválido. Usa 'trivial', 'partial' o 'scaled'"}

        swapped = False
        if pivot_row != k:
            M[[k, pivot_row]] = M[[pivot_row, k]]
            scale_factors[[k, pivot_row]] = scale_factors[[pivot_row, k]]
            swapped = True

        if invalid_pivot(k, k):
            return {
                "success": False,
                "error": f"Pivote cero (o casi cero) en columna {k + 1}. Prueba pivoteo parcial o escalado.",
                "steps": steps,
            }

        for i in range(k + 1, n):
            factor = M[i, k] / M[k, k]
            M[i, k:] = M[i, k:] - factor * M[k, k:]
            M[i, k] = 0.0

        steps.append({
            "step": k + 1,
            "pivot_row_selected": int(pivot_row + 1),
            "swapped": swapped,
            "augmented_matrix": [[round(float(val), 8) for val in row] for row in M],
        })

        if n == 3:
            plot_steps.append({
                "label": f"Eliminación en columna {k + 1}",
                "matrix": M.tolist(),
                "pivot_row": pivot_row + 1,
                "swapped": swapped,
            })

    if invalid_pivot(n - 1, n - 1):
        return {"success": False, "error": "Sistema singular o con infinitas soluciones", "steps": steps}

    # Sustitución hacia atrás
    x = np.zeros(n, dtype=float)
    for i in range(n - 1, -1, -1):
        sum_ax = np.dot(M[i, i + 1:n], x[i + 1:n])
        x[i] = (M[i, n] - sum_ax) / M[i, i]

    if not np.all(np.isfinite(x)):
        return {
            "success": False,
            "error": "Solucion numericamente no finita",
            "steps": steps,
        }

    result = {
        "success": True,
        "pivoting_mode": mode,
        "solution": x.tolist(),
        "upper_triangular_augmented": [[round(float(val), 8) for val in row] for row in M],
        "steps": steps,
    }

    if n == 3 and np.all(np.isfinite(x)):
        if all(
            np.all(np.isfinite(item["matrix"]))
            for item in plot_steps
        ):
            plot_steps.append({
                "label": "Solución por sustitución",
                "matrix": M.tolist(),
                "pivot_row": None,
                "swapped": False,
            })

            result["plot"] = {
                "kind": "linear_system",
                "title": "Sistema de ecuaciones XYZ",
                "solution": x.tolist(),
                "pivoting": mode,
                "steps": plot_steps,
            }

    return result


# ==========================================
# UTILIDAD INTERNA PARA EDO: PARSER f(t, y)
# ==========================================
def _compile_ode_function(expr_str: str):
    t_sym, y_sym = sp.symbols("t y")
    sym_expr = parse_math_expression(
        expr_str, {"t": t_sym, "y": y_sym}
    )
    f_num = sp.lambdify((t_sym, y_sym), sym_expr, modules=["numpy"])
    return f_num, sym_expr, t_sym, y_sym


# ==========================================
# 29. MÉTODO DE EULER
# ==========================================
def euler_ode(expr_str: str, t0: float, y0: float, tf: float, n_steps: int = 20):
    if n_steps < 1:
        return {"success": False, "error": "n_steps debe ser al menos 1"}
    try:
        f, _, _, _ = _compile_ode_function(expr_str)
    except Exception as e:
        return {"success": False, "error": f"Error al interpretar f(t, y): {e}"}

    t, y = float(t0), float(y0)
    h = (float(tf) - t) / n_steps
    plot_steps = []
    trajectory = [{"step": 0, "t": round(t, 8), "y": round(y, 8), "slope": round(float(f(t, y)), 8)}]

    for i in range(1, n_steps + 1):
        start_t, start_y = t, y
        k1 = float(f(t, y))
        y = y + h * k1
        t = t0 + i * h
        if n_steps <= MAX_PLOT_STEPS:
            plot_steps.append(make_ode_step(
                "euler", i,
                start_t, start_y, t, y, h,
                [k1], None,
            ))

        trajectory.append({
            "step": i,
            "t": round(t, 8),
            "y": round(y, 8),
            "slope": round(k1, 8),
        })

    return {
        "success": True,
        "method": "Euler",
        "h": round(h, 8),
        "final_t": round(t, 8),
        "final_y": round(y, 8),
        "trajectory": trajectory,
        "plot": build_ode_plot(
            "euler", expr_str, plot_steps
        ),
    }


# ==========================================
# 30. MÉTODO DE TAYLOR DE ORDEN 2
# ==========================================
def taylor_order2_ode(expr_str: str, t0: float, y0: float, tf: float, n_steps: int = 20):
    """
    y_{i+1} = y_i + h*f(t_i, y_i) + (h^2 / 2)*f'(t_i, y_i)
    donde f'(t, y) = df/dt + (df/dy)*f(t, y) calculada simbólicamente con SymPy.
    """
    if n_steps < 1:
        return {"success": False, "error": "n_steps debe ser al menos 1"}
    try:
        f, sym_f, t_sym, y_sym = _compile_ode_function(expr_str)
        df_dt = sp.diff(sym_f, t_sym)
        df_dy = sp.diff(sym_f, y_sym)
        sym_df = sp.simplify(df_dt + df_dy * sym_f)
        df_num = sp.lambdify((t_sym, y_sym), sym_df, modules=["numpy"])
    except Exception as e:
        return {"success": False, "error": f"Error simbólico en Taylor orden 2: {e}"}

    t, y = float(t0), float(y0)
    h = (float(tf) - t) / n_steps
    plot_steps = []
    trajectory = [{"step": 0, "t": round(t, 8), "y": round(y, 8)}]

    for i in range(1, n_steps + 1):
        start_t, start_y = t, y
        f_val = float(f(t, y))
        df_val = float(df_num(t, y))
        y = y + h * f_val + 0.5 * (h ** 2) * df_val
        t = t0 + i * h
        if n_steps <= MAX_PLOT_STEPS:
            plot_steps.append(make_ode_step(
                "taylor2", i,
                start_t, start_y, t, y, h,
                [f_val], df_val,
            ))

        trajectory.append({
            "step": i,
            "t": round(t, 8),
            "y": round(y, 8),
            "f_val": round(f_val, 8),
            "df_total": round(df_val, 8),
        })

    return {
        "success": True,
        "method": "Taylor de orden 2",
        "symbolic_total_derivative": str(sym_df),
        "h": round(h, 8),
        "final_t": round(t, 8),
        "final_y": round(y, 8),
        "trajectory": trajectory,
        "plot": build_ode_plot(
            "taylor2", expr_str, plot_steps
        ),
    }


# ==========================================
# 31. MÉTODO DE EULER MODIFICADO (HEUN)
# ==========================================
def modified_euler_ode(expr_str: str, t0: float, y0: float, tf: float, n_steps: int = 20):
    if n_steps < 1:
        return {"success": False, "error": "n_steps debe ser al menos 1"}
    try:
        f, _, _, _ = _compile_ode_function(expr_str)
    except Exception as e:
        return {"success": False, "error": f"Error al interpretar f(t, y): {e}"}

    t, y = float(t0), float(y0)
    h = (float(tf) - t) / n_steps
    plot_steps = []
    trajectory = [{"step": 0, "t": round(t, 8), "y": round(y, 8)}]

    for i in range(1, n_steps + 1):
        start_t, start_y = t, y
        k1 = float(f(t, y))
        y_pred = y + h * k1
        t_next = t0 + i * h
        k2 = float(f(t_next, y_pred))
        y = y + 0.5 * h * (k1 + k2)
        t = t_next
        if n_steps <= MAX_PLOT_STEPS:
            plot_steps.append(make_ode_step(
                "modified_euler", i,
                start_t, start_y, t, y, h,
                [k1, k2], None,
            ))

        trajectory.append({
            "step": i,
            "t": round(t, 8),
            "y": round(y, 8),
            "k1": round(k1, 8),
            "k2": round(k2, 8),
        })

    return {
        "success": True,
        "method": "Euler modificado",
        "h": round(h, 8),
        "final_t": round(t, 8),
        "final_y": round(y, 8),
        "trajectory": trajectory,
        "plot": build_ode_plot(
            "modified_euler", expr_str, plot_steps
        ),
    }


# ==========================================
# 32. MÉTODO DEL PUNTO MEDIO
# ==========================================
def midpoint_ode(expr_str: str, t0: float, y0: float, tf: float, n_steps: int = 20):
    if n_steps < 1:
        return {"success": False, "error": "n_steps debe ser al menos 1"}
    try:
        f, _, _, _ = _compile_ode_function(expr_str)
    except Exception as e:
        return {"success": False, "error": f"Error al interpretar f(t, y): {e}"}

    t, y = float(t0), float(y0)
    h = (float(tf) - t) / n_steps
    plot_steps = []
    trajectory = [{"step": 0, "t": round(t, 8), "y": round(y, 8)}]

    for i in range(1, n_steps + 1):
        start_t, start_y = t, y
        k1 = float(f(t, y))
        k2 = float(f(t + 0.5 * h, y + 0.5 * h * k1))
        y = y + h * k2
        t = t0 + i * h
        if n_steps <= MAX_PLOT_STEPS:
            plot_steps.append(make_ode_step(
                "midpoint", i,
                start_t, start_y, t, y, h,
                [k1, k2], None,
            ))

        trajectory.append({
            "step": i,
            "t": round(t, 8),
            "y": round(y, 8),
            "k1": round(k1, 8),
            "k2_mid": round(k2, 8),
        })

    return {
        "success": True,
        "method": "Punto medio",
        "h": round(h, 8),
        "final_t": round(t, 8),
        "final_y": round(y, 8),
        "trajectory": trajectory,
        "plot": build_ode_plot(
            "midpoint", expr_str, plot_steps
        ),
    }


# ==========================================
# 33. MÉTODO DE RUNGE-KUTTA DE ORDEN 4 (RK4)
# ==========================================
def rk4_ode(expr_str: str, t0: float, y0: float, tf: float, n_steps: int = 20):
    if n_steps < 1:
        return {"success": False, "error": "n_steps debe ser al menos 1"}
    try:
        f, _, _, _ = _compile_ode_function(expr_str)
    except Exception as e:
        return {"success": False, "error": f"Error al interpretar f(t, y): {e}"}

    t, y = float(t0), float(y0)
    h = (float(tf) - t) / n_steps
    plot_steps = []
    trajectory = [{"step": 0, "t": round(t, 8), "y": round(y, 8)}]

    for i in range(1, n_steps + 1):
        start_t, start_y = t, y
        k1 = float(f(t, y))
        k2 = float(f(t + 0.5 * h, y + 0.5 * h * k1))
        k3 = float(f(t + 0.5 * h, y + 0.5 * h * k2))
        k4 = float(f(t + h, y + h * k3))

        y = y + (h / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)
        t = t0 + i * h

        if n_steps <= MAX_PLOT_STEPS:
            plot_steps.append(make_ode_step(
                "rk4", i,
                start_t, start_y, t, y, h,
                [k1, k2, k3, k4], None,
            ))

        trajectory.append({
            "step": i,
            "t": round(t, 8),
            "y": round(y, 8),
            "k1": round(k1, 8),
            "k2": round(k2, 8),
            "k3": round(k3, 8),
            "k4": round(k4, 8),
        })

    return {
        "success": True,
        "method": "Runge-Kutta 4",
        "h": round(h, 8),
        "final_t": round(t, 8),
        "final_y": round(y, 8),
        "trajectory": trajectory,
        "plot": build_ode_plot(
            "rk4", expr_str, plot_steps
        ),
    }
