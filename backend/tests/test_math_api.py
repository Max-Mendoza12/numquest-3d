import json
import math
import unittest
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000/api"

ROOT = "/unit1/roots"
POLY = "/unit2/polynomials"
INTERP = "/unit3/interpolation"
CALC = "/unit4/calculus"
LINEAR = "/unit5/linear-system"
ODE = "/unit5/ode"


def api(path, payload=None):
    body = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(
        BASE + path,
        data=body,
        headers={"Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(
            f"HTTP {exc.code}: {exc.read().decode()}"
        ) from exc


def close(a, b, tol=1e-5):
    return math.isclose(a, b, abs_tol=tol, rel_tol=0)


def root_is(d, expected):
    return d.get("converged") and close(d["root"], expected)


def value_is(d, key, expected):
    return d.get("success") and close(d[key], expected)


def roots_are(d, expected):
    if not d.get("converged"):
        return False

    actual = [
        complex(r["real"], r["imag"])
        for r in d["roots"]
    ]

    expected = [complex(z) for z in expected]

    if len(actual) != len(expected):
        return False

    actual.sort(key=lambda z: (z.real, z.imag))
    expected.sort(key=lambda z: (z.real, z.imag))

    return all(abs(a-b) < 1e-5
               for a, b in zip(actual, expected))


def cubic_factor_is_valid(d):
    if not d.get("converged") or len(d["roots"]) != 2:
        return False

    for r in d["roots"]:
        z = complex(r["real"], r["imag"])
        if abs(z**3-7*z**2+14*z-8) >= 1e-5:
            return False

    return True


class MathAPITests(unittest.TestCase):
    pass


def register(name, path, payload, check):
    def run(self):
        result = api(path, payload)
        self.assertTrue(check(result), msg=str(result))

    run.__name__ = "test_" + name
    setattr(MathAPITests, run.__name__, run)


# ==================================================
# UNIDAD 1: PUNTO FLOTANTE Y RAICES
# ==================================================

register(
    "u1_ieee754",
    "/unit1/float/13.625",
    None,
    lambda d:
        d["ieee754_32"]["sign"] == "0"
        and d["ieee754_32"]["exponent"] == "10000010"
        and d["ieee754_32"]["mantissa"] == "101101" + "0"*17
        and d["ieee754_64"]["sign"] == "0"
        and d["ieee754_64"]["exponent"] == "10000000010"
        and d["ieee754_64"]["mantissa"] == "101101" + "0"*46,
)

for method, params in [
    ("bisection", {"a": 1, "b": 2}),
    ("false_position", {"a": 1, "b": 2}),
    ("fixed_point", {
        "expression": "(x+2/x)/2", "x0": 1.5
    }),
    ("newton", {"x0": 1.5}),
    ("secant", {"x0": 1, "x1": 2}),
    ("steffensen", {"x0": 1.5}),
]:
    register(
        "u1_" + method,
        ROOT,
        {
            "method": method,
            "expression": "x^2-2",
            "tol": 1e-6,
            "max_iter": 100,
            **params,
        },
        lambda d: root_is(d, math.sqrt(2)),
    )

for name, expr, x0, limit, expected in [
    ("double", "(x-2)^2", 3, 100, 2),
    ("exact_initial", "(x-2)^2", 2, 100, 2),
    ("single_iteration", "(x-2)^2", 3, 1, 2),
    ("triple", "(x-3)^3", 4, 100, 3),
    ("simple", "x^2-2", 1.5, 100, math.sqrt(2)),
]:
    register(
        "u1_newton_multiple_" + name,
        ROOT,
        {
            "method": "newton_multiple",
            "expression": expr,
            "x0": x0,
            "max_iter": limit,
        },
        lambda d, e=expected: root_is(d, e),
    )

for name, expr, x0 in [
    ("stationary", "x^2+1", 0),
    ("stationary_shifted", "(x-3)^2+1", 3),
]:
    register(
        "u1_newton_multiple_" + name,
        ROOT,
        {
            "method": "newton_multiple",
            "expression": expr,
            "x0": x0,
        },
        lambda d: d["converged"] is False,
    )

register(
    "u1_muller_complex",
    ROOT,
    {
        "method": "muller",
        "expression": "x^2+1",
        "x0": 0,
        "x1": 1,
        "x2": 2,
    },
    lambda d:
        d["converged"]
        and close(d["root"]["real"], 0)
        and close(abs(d["root"]["imag"]), 1),
)


# ==================================================
# UNIDAD 2: POLINOMIOS Y ACELERACION
# ==================================================

register(
    "u2_horner",
    POLY,
    {"method": "horner", "coeffs": [1, 0, -2], "x0": 2},
    lambda d:
        d["success"]
        and close(d["p_x0"], 2)
        and close(d["dp_x0"], 4),
)

register(
    "u2_newton_horner",
    POLY,
    {
        "method": "newton_horner",
        "coeffs": [1, 0, -2],
        "x0": 1.5,
    },
    lambda d: root_is(d, math.sqrt(2)),
)

register(
    "u2_deflation",
    POLY,
    {
        "method": "deflation",
        "coeffs": [1, -6, 11, -6],
        "x0": 3.5,
    },
    lambda d: roots_are(d, [1, 2, 3]),
)

register(
    "u2_aitken",
    POLY,
    {
        "method": "aitken",
        "expression": "(x+2/x)/2",
        "x0": 1.5,
    },
    lambda d: root_is(d, math.sqrt(2)),
)

register(
    "u2_bairstow_cubic",
    POLY,
    {
        "method": "bairstow",
        "coeffs": [1, -7, 14, -8],
        "r": 2.8,
        "s": -1.8,
    },
    cubic_factor_is_valid,
)

for name, coeffs, expected in [
    ("quadratic", [1, -3, 2], [1, 2]),
    ("non_monic", [2, -6, 4], [1, 2]),
    ("repeated", [1, -4, 4], [2, 2]),
    ("zero_root", [1, -2, 0], [0, 2]),
    ("complex", [1, 0, 1], [-1j, 1j]),
]:
    register(
        "u2_bairstow_" + name,
        POLY,
        {"method": "bairstow", "coeffs": coeffs},
        lambda d, e=expected: roots_are(d, e),
    )

register(
    "u2_bairstow_invalid_leading_coefficient",
    POLY,
    {"method": "bairstow", "coeffs": [0, -3, 2]},
    lambda d: d["converged"] is False,
)


# ==================================================
# UNIDAD 3: INTERPOLACION
# ==================================================

for method in [
    "vandermonde",
    "lagrange",
    "neville",
    "divided_differences",
    "hermite",
]:
    register(
        "u3_" + method,
        INTERP,
        {
            "method": method,
            "x_pts": [0, 1, 2],
            "y_pts": [0, 1, 4],
            "dy_pts": [0, 2, 4],
            "x_eval": 1.5,
        },
        lambda d: value_is(d, "y_eval", 2.25),
    )

for boundary in ["natural", "sujeto"]:
    register(
        "u3_spline_" + boundary,
        INTERP,
        {
            "method": "cubic_spline",
            "x_pts": [0, 1, 2],
            "y_pts": [1, 3, 5],
            "x_eval": 1.5,
            "boundary_type": boundary,
            "fp0": 2,
            "fpn": 2,
        },
        lambda d: value_is(d, "y_eval", 4),
    )


# ==================================================
# UNIDAD 4: DERIVACION E INTEGRACION
# ==================================================

for points in [2, 3, 5]:
    register(
        f"u4_diff_{points}_points",
        CALC,
        {
            "method": "diff",
            "expression": "3*x+2",
            "x0": 2,
            "h": 0.01,
            "points": points,
            "formula": "forward" if points == 2 else "centered",
        },
        lambda d: value_is(d, "derivative", 3),
    )

register(
    "u4_richardson",
    CALC,
    {
        "method": "richardson",
        "expression": "x^3",
        "x0": 2,
        "h": 0.1,
        "levels": 4,
    },
    lambda d: value_is(d, "derivative", 12),
)

for method in [
    "trapezoid",
    "simpson_1_3",
    "simpson_3_8",
    "romberg",
    "adaptive",
]:
    register(
        "u4_" + method,
        CALC,
        {
            "method": method,
            "expression": "2*x+1",
            "a": 0,
            "b": 2,
            "n": 12,
        },
        lambda d: value_is(d, "integral", 6),
    )

for points in [2, 3, 4, 5]:
    register(
        f"u4_gaussian_{points}_nodes",
        CALC,
        {
            "method": "gaussian",
            "expression": "x^2",
            "a": 0,
            "b": 1,
            "points": points,
        },
        lambda d: value_is(d, "integral", 1/3),
    )


# ==================================================
# UNIDAD 5: SISTEMAS LINEALES Y EDO
# ==================================================

for pivot in ["trivial", "partial", "scaled"]:
    register(
        "u5_gauss_" + pivot,
        LINEAR,
        {
            "A": [[2, 1], [1, 3]],
            "b": [5, 5],
            "pivoting": pivot,
        },
        lambda d:
            d["success"]
            and len(d["solution"]) == 2
            and close(d["solution"][0], 2)
            and close(d["solution"][1], 1),
    )

for method in [
    "euler",
    "taylor2",
    "modified_euler",
    "midpoint",
    "rk4",
]:
    if method == "euler":
        expected = 1.1**10
    elif method == "rk4":
        expected = math.e
    else:
        expected = 1.105**10

    register(
        "u5_" + method,
        ODE,
        {
            "method": method,
            "expression": "y",
            "t0": 0,
            "y0": 1,
            "tf": 1,
            "n_steps": 10,
        },
        lambda d, e=expected: value_is(d, "final_y", e),
    )


if __name__ == "__main__":
    unittest.main(verbosity=2)
