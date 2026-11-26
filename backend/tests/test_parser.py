import json
import math
import sys
import unittest
import urllib.request
import urllib.error

from pathlib import Path

sys.path.insert(
    0, str(Path(__file__).resolve().parents[1])
)

from core.parser import build_function
from methods.unit5_linear_ode import _compile_ode_function


class ParserTests(unittest.TestCase):
    pass


def register_valid(name, expression, x, expected):
    def run(self):
        result = build_function(expression)["f"](x)
        self.assertTrue(
            math.isclose(
                float(result),
                expected,
                abs_tol=1e-10
            )
        )

    setattr(ParserTests, "test_valid_" + name, run)


for case in [
    ("implicit", "2x+3", 2, 7),
    ("polynomial", "x^3-2*x-5", 2, -1),
    ("parentheses", "2(x+1)", 2, 6),
    ("sin", "sin(x)", math.pi/2, 1),
    ("cos", "cos(x)", 0, 1),
    ("sqrt", "sqrt(x)", 9, 3),
    ("log", "ln(x)", math.e, 1),
    ("exp", "exp(x)", 0, 1),
    ("pi", "2pi", 0, 2*math.pi),
    ("scientific", "1e-6*x", 2, 2e-6),
    ("product", "(x+1)(x-1)", 3, 8),
    ("fractional_power", "(2*x+5)^(1/3)", 11, 3),
]:
    register_valid(*case)


class SymbolicTests(unittest.TestCase):

    def test_first_derivative(self):
        f = build_function("x^3")
        self.assertAlmostEqual(float(f["df"](2)), 12)

    def test_second_derivative(self):
        f = build_function("x^3")
        self.assertAlmostEqual(float(f["d2f"](2)), 12)

    def test_ode_expression(self):
        f, _, _, _ = _compile_ode_function(
            "y-t^2+1"
        )
        self.assertAlmostEqual(float(f(2, 5)), 2)


def register_invalid(name, expression):
    def run(self):
        with self.assertRaises(ValueError):
            build_function(expression)

    setattr(ParserTests, "test_invalid_" + name, run)


for case in [
    ("empty", ""),
    ("unknown_function", "unknown(x)"),
    ("unknown_variable", "x+y"),
    ("attribute", "x.attribute"),
    ("index", "x[0]"),
    ("assignment", "x=2"),
    ("semicolon", "x;2"),
    ("string", "'texto'"),
    ("empty_function", "sin()"),
    ("missing_parentheses", "sin x"),
    ("floor_division", "x//2"),
    ("large_exponent", "x^1000"),
    ("length", "x"*257),
    ("nesting", "("*17 + "x" + ")"*17),
]:
    register_invalid(*case)


class ParserAPITests(unittest.TestCase):
    pass


def register_api(name, path, payload, expected_status):
    def run(self):
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api" + path,
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json"
            },
        )

        if expected_status == 400:
            with self.assertRaises(
                urllib.error.HTTPError
            ) as ctx:
                urllib.request.urlopen(
                    req, timeout=15
                )

            with ctx.exception as error:
                self.assertEqual(error.code, 400)

        else:
            with urllib.request.urlopen(
                req, timeout=15
            ) as response:
                data = json.load(response)

            self.assertIs(data.get("success"), False)
            self.assertTrue(data.get("error"))

    setattr(ParserAPITests, "test_api_" + name, run)


for method in ["newton", "newton_multiple"]:
    register_api(
        method,
        "/unit1/roots",
        {
            "method": method,
            "expression": "unknown(x)",
            "x0": 1
        },
        400
    )


register_api(
    "aitken",
    "/unit2/polynomials",
    {
        "method": "aitken",
        "expression": "unknown(x)",
        "x0": 1
    },
    400
)


register_api(
    "calculus",
    "/unit4/calculus",
    {
        "method": "diff",
        "expression": "unknown(x)",
        "x0": 1
    },
    400
)


for method in [
    "euler",
    "taylor2",
    "modified_euler",
    "midpoint",
    "rk4",
]:
    register_api(
        method,
        "/unit5/ode",
        {
            "method": method,
            "expression": "unknown(t)",
            "t0": 0,
            "y0": 1,
            "tf": 1,
            "n_steps": 10
        },
        200
    )


if __name__ == "__main__":
    unittest.main(verbosity=2)
