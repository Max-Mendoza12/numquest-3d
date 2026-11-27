import math
import unittest
import numpy as np

from test_math_api import (
    api, ROOT, POLY, INTERP, CALC, LINEAR, ODE
)

from methods.unit4_calculus import adaptive_quadrature


class AdvancedAuditTests(unittest.TestCase):
    pass


def register(name, action):
    def run(self):
        self.assertTrue(action(), name)

    run.__name__ = "test_" + name
    assert not hasattr(AdvancedAuditTests, run.__name__)
    setattr(AdvancedAuditTests, run.__name__, run)


def close(a, b, tol=1e-6):
    return math.isclose(a, b, rel_tol=tol, abs_tol=tol)


def reject(result):
    return (
        result.get("success") is False
        or result.get("converged") is False
    )


def root_case(method, expression, expected, **params):
    result = api(ROOT, {
        "method": method,
        "expression": expression,
        "max_iter": 200,
        **params,
    })

    return (
        result.get("converged") is True
        and close(result["root"], expected)
    )


def solve_value(path, payload, key, expected, tol=1e-6):
    result = api(path, payload)

    return (
        result.get("success") is True
        and close(result[key], expected, tol)
    )


# IEEE 754: 2 pruebas

register("negative_zero", lambda: (
    api("/unit1/float/-0.0")["ieee754_32"]["sign"] == "1"
    and
    api("/unit1/float/-0.0")["ieee754_64"]["sign"] == "1"
))


def subnormal():
    bits = api(
        "/unit1/float/" + str(2**-149)
    )["ieee754_32"]

    return (
        bits["sign"] == "0"
        and bits["exponent"] == "00000000"
        and bits["mantissa"] == "0"*22 + "1"
    )


register("minimum_subnormal_32", subnormal)


# Raices: 14 pruebas

for method, params in [
    ("bisection", {"a": 1, "b": 4}),
    ("false_position", {"a": 1, "b": 4}),
    ("newton", {"x0": 3}),
    ("secant", {"x0": 1, "x1": 4}),
    ("newton_multiple", {"x0": 3}),
    ("steffensen", {"x0": 3}),
]:
    for scale, label in [
        ("1e-20", "small"),
        ("1e20", "large"),
    ]:
        register(
            f"{method}_scale_{label}",
            lambda m=method, p=params, s=scale:
                root_case(m, f"{s}*(x-2)", 2, **p)
        )


register("bisection_discontinuity", lambda:
    reject(api(ROOT, {
        "method": "bisection",
        "expression": "1/(x-1)",
        "a": 0,
        "b": 3,
    }))
)


register("fixed_point_divergent", lambda:
    reject(api(ROOT, {
        "method": "fixed_point",
        "expression": "x+1",
        "x0": 0,
        "max_iter": 20,
    }))
)


# Polinomios: 2 pruebas

def polynomial_residual(coeffs, z):
    numerator = abs(np.polyval(coeffs, z))
    degree = len(coeffs) - 1

    denominator = sum(
        abs(c) * abs(z)**(degree-i)
        for i, c in enumerate(coeffs)
    )

    return numerator / max(denominator, 1e-300)


def deflation_check():
    coeffs = [1, -10, 35, -50, 24]

    result = api(POLY, {
        "method": "deflation",
        "coeffs": coeffs,
        "x0": 4.5,
        "max_iter": 200,
    })

    if not result.get("converged"):
        return False

    roots = [
        complex(r["real"], r["imag"])
        for r in result["roots"]
    ]

    return (
        len(roots) == 4
        and np.allclose(
            sorted(z.real for z in roots), [1, 2, 3, 4]
        )
        and all(abs(z.imag) < 1e-6 for z in roots)
        and all(
            polynomial_residual(coeffs, z) < 1e-7
            for z in roots
        )
    )


def bairstow_check():
    coeffs = [1, 0, 5, 0, 4]

    result = api(POLY, {
        "method": "bairstow",
        "coeffs": coeffs,
        "r": 0.2,
        "s": -1.1,
        "max_iter": 200,
    })

    if not result.get("converged"):
        return False

    roots = [
        complex(r["real"], r["imag"])
        for r in result["roots"]
    ]

    return (
        len(roots) == 2
        and all(
            polynomial_residual(coeffs, z) < 1e-7
            for z in roots
        )
    )


register("deflation_residuals", deflation_check)
register("bairstow_complex_factor", bairstow_check)


# Interpolacion: 12 pruebas

def polynomial(x):
    return x**3 - 2*x + 1


xs = [3, -1, 0, 2]
ys = [polynomial(x) for x in xs]


for method in [
    "vandermonde",
    "lagrange",
    "neville",
    "divided_differences",
    "hermite",
]:
    for x_eval, label in [
        (-0.5, "interpolation"),
        (4.0, "extrapolation"),
    ]:
        register(
            f"{method}_{label}",
            lambda m=method, x=x_eval:
                solve_value(INTERP, {
                    "method": m,
                    "x_pts": xs,
                    "y_pts": ys,
                    "dy_pts": [3*v*v-2 for v in xs],
                    "x_eval": x,
                }, "y_eval", polynomial(x))
        )


register("clamped_spline_exact_cubic", lambda:
    solve_value(INTERP, {
        "method": "cubic_spline",
        "x_pts": [0, 1, 3],
        "y_pts": [0, 1, 27],
        "x_eval": 2,
        "boundary_type": "sujeto",
        "fp0": 0,
        "fpn": 27,
    }, "y_eval", 8)
)


def spline_continuity():
    result = api(INTERP, {
        "method": "cubic_spline",
        "x_pts": [0, 1, 2, 4],
        "y_pts": [1, 3, -1, 2],
        "x_eval": 1.5,
        "boundary_type": "natural",
    })

    if not result.get("success"):
        return False

    segments = result["segments"]

    for left, right in zip(segments, segments[1:]):
        h = left["interval"][1] - left["interval"][0]

        y = (
            left["a"] + left["b"]*h
            + left["c"]*h*h + left["d"]*h**3
        )

        dy = (
            left["b"] + 2*left["c"]*h
            + 3*left["d"]*h*h
        )

        d2y = 2*left["c"] + 6*left["d"]*h

        if not (
            close(y, right["a"])
            and close(dy, right["b"])
            and close(d2y, 2*right["c"])
        ):
            return False

    last = segments[-1]
    h = last["interval"][1] - last["interval"][0]

    return (
        close(segments[0]["c"], 0)
        and close(2*last["c"] + 6*last["d"]*h, 0)
    )


register("natural_spline_continuity", spline_continuity)


# Derivacion e integracion: 12 pruebas

def differentiation_order(points, formula, expected_order):
    errors = []

    for h in [0.2, 0.1]:
        result = api(CALC, {
            "method": "diff",
            "expression": "exp(x)",
            "x0": 1,
            "h": h,
            "points": points,
            "formula": formula,
        })

        if not result.get("success"):
            return False

        errors.append(
            abs(result["derivative"] - math.e)
        )

    if errors[0] <= 0 or errors[1] <= 0:
        return False

    order = math.log2(errors[0] / errors[1])

    return abs(order - expected_order) < 0.6


for points, formula, order in [
    (2, "forward", 1),
    (2, "backward", 1),
    (3, "centered", 2),
    (3, "forward_endpoint", 2),
    (3, "backward_endpoint", 2),
    (5, "centered", 4),
    (5, "forward_endpoint", 4),
    (5, "backward_endpoint", 4),
]:
    register(
        f"diff_{points}_{formula}_order",
        lambda p=points, f=formula, o=order:
            differentiation_order(p, f, o)
    )


def integration_order(method, expected_order):
    errors = []

    for n in [12, 24]:
        result = api(CALC, {
            "method": method,
            "expression": "exp(x)",
            "a": 0,
            "b": 1,
            "n": n,
        })

        if not result.get("success"):
            return False

        errors.append(
            abs(result["integral"] - (math.e-1))
        )

    if errors[0] <= 0 or errors[1] <= 0:
        return False

    observed = math.log2(errors[0] / errors[1])

    return abs(observed-expected_order) < 0.5


for method, order in [
    ("trapezoid", 2),
    ("simpson_1_3", 4),
    ("simpson_3_8", 4),
]:
    register(
        f"{method}_convergence_order",
        lambda m=method, o=order:
            integration_order(m, o)
    )


def adaptive_depth():
    result = adaptive_quadrature(
        math.exp, 0, 1,
        tol=1e-12,
        max_depth=0,
    )

    error = abs(result["integral"] - (math.e-1))

    return (
        error <= 1e-12
        or result.get("converged") is False
        or result.get("success") is False
    )


register("adaptive_depth_exhausted", adaptive_depth)


# Sistemas lineales: 9 pruebas

def linear_scaled(pivoting, scale):
    A = np.array([
        [4, 1, -1],
        [2, 7, 1],
        [1, -3, 12],
    ], dtype=float) * scale

    expected = np.array([2, -1, 3], dtype=float)
    b = A @ expected

    result = api(LINEAR, {
        "A": A.tolist(),
        "b": b.tolist(),
        "pivoting": pivoting,
    })

    if not result.get("success"):
        return False

    actual = np.array(result["solution"])

    residual = (
        np.linalg.norm(A @ actual - b)
        / np.linalg.norm(b)
    )

    return (
        np.allclose(actual, expected)
        and residual < 1e-8
    )


for pivot in ["trivial", "partial", "scaled"]:
    for scale, label in [
        (1e-20, "small"),
        (1.0, "normal"),
        (1e20, "large"),
    ]:
        register(
            f"gauss_{pivot}_{label}",
            lambda p=pivot, s=scale:
                linear_scaled(p, s)
        )


# EDO: 5 pruebas

def ode_order(method, expected_order):
    exact = 2*math.e - 2
    errors = []

    for n in [10, 20, 40]:
        result = api(ODE, {
            "method": method,
            "expression": "t+y",
            "t0": 0,
            "y0": 1,
            "tf": 1,
            "n_steps": n,
        })

        if not result.get("success"):
            return False

        plot = result.get("plot")

        if not plot:
            return False

        errors.append(abs(plot["final_y"] - exact))

    if errors[-2] <= 0 or errors[-1] <= 0:
        return False

    order = math.log2(errors[-2] / errors[-1])

    return (
        errors[2] < errors[1] < errors[0]
        and abs(order-expected_order) < 0.4
    )


for method, order in [
    ("euler", 1),
    ("taylor2", 2),
    ("modified_euler", 2),
    ("midpoint", 2),
    ("rk4", 4),
]:
    register(
        f"ode_{method}_convergence_order",
        lambda m=method, o=order:
            ode_order(m, o)
    )


assert len([
    name for name in vars(AdvancedAuditTests)
    if name.startswith("test_")
]) == 56
