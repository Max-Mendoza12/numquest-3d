from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from core.parser import build_function
from core.newton_plot import build_newton_plot
from methods.unit1_roots import (
    analyze_float,
    bisection_method,
    false_position_method,
    fixed_point_method,
    newton_raphson_method,
    newton_multiple_roots_method,
    secant_method,
    steffensen_method,
    muller_method,
    bairstow_method,
)
from methods.unit2_polynomials import (
    horner_method,
    newton_horner_method,
    polynomial_deflation_method,
    aitken_delta2_method,
)
from methods.unit3_interpolation import (
    vandermonde_interpolation,
    lagrange_interpolation,
    neville_interpolation,
    divided_differences_interpolation,
    hermite_interpolation,
    cubic_spline_interpolation,
)
from methods.unit4_calculus import (
    numerical_differentiation,
    richardson_extrapolation,
    trapezoidal_rule,
    simpson_1_3_rule,
    simpson_3_8_rule,
    romberg_integration,
    adaptive_quadrature,
    gaussian_quadrature,
)
from methods.unit5_linear_ode import (
    gaussian_elimination,
    euler_ode,
    taylor_order2_ode,
    modified_euler_ode,
    midpoint_ode,
    rk4_ode,
)

app = FastAPI(title="NumQuest 3D - Motor Matemático", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# MODELOS PYDANTIC DE ENTRADA
# ==========================================
class RootRequest(BaseModel):
    method: str  # bisection, false_position, fixed_point, newton, newton_multiple, secant, steffensen, muller
    expression: str
    a: Optional[float] = None
    b: Optional[float] = None
    x0: Optional[float] = None
    x1: Optional[float] = None
    x2: Optional[float] = None
    tol: float = 1e-6
    max_iter: int = 100


class BairstowRequest(BaseModel):
    coeffs: List[float]
    r: float = -1.0
    s: float = -1.0
    tol: float = 1e-6
    max_iter: int = 100


class PolynomialRequest(BaseModel):
    method: str  # horner, newton_horner, deflation, aitken, bairstow
    coeffs: Optional[List[float]] = None
    expression: Optional[str] = None
    x0: float = 0.0
    r: float = -1.0
    s: float = -1.0
    tol: float = 1e-6
    max_iter: int = 100


class InterpolationRequest(BaseModel):
    method: str  # vandermonde, lagrange, neville, divided_differences, hermite, cubic_spline
    x_pts: List[float]
    y_pts: List[float]
    dy_pts: Optional[List[float]] = None
    x_eval: float
    boundary_type: str = "natural"  # natural | sujeto
    fp0: float = 0.0
    fpn: float = 0.0


class CalculusRequest(BaseModel):
    method: str  # diff, richardson, trapezoid, simpson_1_3, simpson_3_8, romberg, adaptive, gaussian
    expression: str
    x0: Optional[float] = None
    h: float = 1e-3
    points: int = 3
    formula: str = "centered"
    levels: int = 4
    a: Optional[float] = None
    b: Optional[float] = None
    n: int = 10
    tol: float = 1e-6


class LinearSystemRequest(BaseModel):
    A: List[List[float]]
    b: List[float]
    pivoting: str = "partial"  # trivial | partial | scaled


class ODERequest(BaseModel):
    method: str  # euler, taylor2, modified_euler, midpoint, rk4
    expression: str
    t0: float
    y0: float
    tf: float
    n_steps: int = 20


# ==========================================
# ENDPOINTS BASE Y UNIDAD 1 (RAÍCES)
# ==========================================
@app.get("/")
def root():
    return {"status": "online", "message": "Motor NumQuest 3D v2.0 (33 métodos) activo"}


@app.get("/api/unit1/float/{number}")
def get_float_analysis(number: float):
    return analyze_float(number)


@app.post("/api/unit1/roots")
def solve_root(req: RootRequest):
    try:
        parsed = build_function(req.expression)
        f, df = parsed["f"], parsed["df"]

        if req.method == "bisection":
            res = bisection_method(f, req.a, req.b, req.tol, req.max_iter)
        elif req.method == "false_position":
            res = false_position_method(f, req.a, req.b, req.tol, req.max_iter)
        elif req.method == "fixed_point":
            res = fixed_point_method(f, req.x0, req.tol, req.max_iter)
        elif req.method == "newton":
            res = newton_raphson_method(f, df, req.x0, req.tol, req.max_iter)
        elif req.method == "newton_multiple":
            d2f = parsed["d2f"]
            res = newton_multiple_roots_method(f, df, d2f, req.x0, req.tol, req.max_iter)
        elif req.method == "secant":
            res = secant_method(f, req.x0, req.x1, req.tol, req.max_iter)
        elif req.method == "steffensen":
            res = steffensen_method(f, req.x0, req.tol, req.max_iter)
        elif req.method == "muller":
            res = muller_method(f, req.x0, req.x1, req.x2, req.tol, req.max_iter)
        else:
            raise HTTPException(status_code=400, detail="Método de raíces no reconocido")

        if req.method in ("newton", "bisection", "secant"):
            res["plot"] = build_newton_plot(
                f, res, req.expression, kind=req.method
            )

        res["latex"] = parsed["latex"]
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/unit1/bairstow")
def solve_bairstow(req: BairstowRequest):
    return bairstow_method(req.coeffs, req.r, req.s, req.tol, req.max_iter)


# ==========================================
# UNIDAD 2: POLINOMIOS Y ACELERACIÓN
# ==========================================
@app.post("/api/unit2/polynomials")
def solve_polynomial_or_accel(req: PolynomialRequest):
    try:
        if req.method == "horner":
            return horner_method(req.coeffs, req.x0)
        elif req.method == "newton_horner":
            return newton_horner_method(req.coeffs, req.x0, req.tol, req.max_iter)
        elif req.method == "deflation":
            return polynomial_deflation_method(req.coeffs, req.x0, req.tol, req.max_iter)
        elif req.method == "aitken":
            parsed = build_function(req.expression)
            res = aitken_delta2_method(parsed["f"], req.x0, req.tol, req.max_iter)
            res["latex"] = parsed["latex"]
            return res
        elif req.method == "bairstow":
            return bairstow_method(req.coeffs, req.r, req.s, req.tol, req.max_iter)
        else:
            raise HTTPException(status_code=400, detail="Método de polinomios/aceleración no reconocido")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==========================================
# UNIDAD 3: INTERPOLACIÓN
# ==========================================
@app.post("/api/unit3/interpolation")
def solve_interpolation(req: InterpolationRequest):
    try:
        if req.method == "vandermonde":
            return vandermonde_interpolation(req.x_pts, req.y_pts, req.x_eval)
        elif req.method == "lagrange":
            return lagrange_interpolation(req.x_pts, req.y_pts, req.x_eval)
        elif req.method == "neville":
            return neville_interpolation(req.x_pts, req.y_pts, req.x_eval)
        elif req.method == "divided_differences":
            return divided_differences_interpolation(req.x_pts, req.y_pts, req.x_eval)
        elif req.method == "hermite":
            return hermite_interpolation(req.x_pts, req.y_pts, req.dy_pts, req.x_eval)
        elif req.method == "cubic_spline":
            return cubic_spline_interpolation(
                req.x_pts, req.y_pts, req.x_eval, req.boundary_type, req.fp0, req.fpn
            )
        else:
            raise HTTPException(status_code=400, detail="Método de interpolación no reconocido")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==========================================
# UNIDAD 4: DERIVACIÓN E INTEGRACIÓN
# ==========================================
@app.post("/api/unit4/calculus")
def solve_calculus(req: CalculusRequest):
    try:
        parsed = build_function(req.expression)
        f = parsed["f"]

        if req.method == "diff":
            res = numerical_differentiation(f, req.x0, req.h, req.points, req.formula)
        elif req.method == "richardson":
            res = richardson_extrapolation(f, req.x0, req.h, req.levels)
        elif req.method == "trapezoid":
            res = trapezoidal_rule(f, req.a, req.b, req.n)
        elif req.method == "simpson_1_3":
            res = simpson_1_3_rule(f, req.a, req.b, req.n)
        elif req.method == "simpson_3_8":
            res = simpson_3_8_rule(f, req.a, req.b, req.n)
        elif req.method == "romberg":
            res = romberg_integration(f, req.a, req.b, req.levels, req.tol)
        elif req.method == "adaptive":
            res = adaptive_quadrature(f, req.a, req.b, req.tol)
        elif req.method == "gaussian":
            res = gaussian_quadrature(f, req.a, req.b, req.points)
        else:
            raise HTTPException(status_code=400, detail="Método de cálculo numérico no reconocido")

        if res.get("plot") is not None:
            res["plot"]["expression"] = req.expression

        res["latex"] = parsed["latex"]
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==========================================
# UNIDAD 5: SISTEMAS LINEALES Y EDO
# ==========================================
@app.post("/api/unit5/linear-system")
def solve_linear_system(req: LinearSystemRequest):
    return gaussian_elimination(req.A, req.b, req.pivoting)


@app.post("/api/unit5/ode")
def solve_ode(req: ODERequest):
    if req.method == "euler":
        return euler_ode(req.expression, req.t0, req.y0, req.tf, req.n_steps)
    elif req.method == "taylor2":
        return taylor_order2_ode(req.expression, req.t0, req.y0, req.tf, req.n_steps)
    elif req.method == "modified_euler":
        return modified_euler_ode(req.expression, req.t0, req.y0, req.tf, req.n_steps)
    elif req.method == "midpoint":
        return midpoint_ode(req.expression, req.t0, req.y0, req.tf, req.n_steps)
    elif req.method == "rk4":
        return rk4_ode(req.expression, req.t0, req.y0, req.tf, req.n_steps)
    else:
        raise HTTPException(status_code=400, detail="Método de EDO no reconocido")