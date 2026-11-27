import math
import unittest

from test_math_api import api, ROOT, POLY, INTERP


class MathAuditTests(unittest.TestCase):

    def assertRoot(self, result, expected):
        self.assertTrue(result["converged"], str(result))
        self.assertAlmostEqual(result["root"], expected, places=6)

    def test_bisection_exact_endpoints(self):
        for a, b in [(1, 3), (-2, 1)]:
            with self.subTest(a=a, b=b):
                self.assertRoot(api(ROOT, {
                    "method": "bisection",
                    "expression": "x-1",
                    "a": a,
                    "b": b,
                }), 1)

    def test_false_position_exact_endpoints(self):
        for a, b in [(1, 3), (-2, 1)]:
            with self.subTest(a=a, b=b):
                self.assertRoot(api(ROOT, {
                    "method": "false_position",
                    "expression": "x-1",
                    "a": a,
                    "b": b,
                }), 1)

    def test_newton_exact_multiple_root(self):
        self.assertRoot(api(ROOT, {
            "method": "newton",
            "expression": "x^2",
            "x0": 0,
        }), 0)

    def test_secant_exact_initial_roots(self):
        result = api(ROOT, {
            "method": "secant",
            "expression": "x^2-1",
            "x0": -1,
            "x1": 1,
        })

        self.assertTrue(result["converged"])
        self.assertAlmostEqual(abs(result["root"]), 1)

    def test_aitken_divergent_sequence(self):
        result = api(POLY, {
            "method": "aitken",
            "expression": "x+1",
            "x0": 0,
        })

        self.assertFalse(result["converged"])

    def test_aitken_exact_fixed_point(self):
        self.assertRoot(api(POLY, {
            "method": "aitken",
            "expression": "x",
            "x0": 3,
        }), 3)

    def test_newton_horner_scaled_polynomial(self):
        self.assertRoot(api(POLY, {
            "method": "newton_horner",
            "coeffs": [1e-10, 0, -2e-10],
            "x0": 1.5,
        }), math.sqrt(2))

    def test_bisection_scaled_function(self):
        self.assertRoot(api(ROOT, {
            "method": "bisection",
            "expression": "1e-20*(x-2)",
            "a": 1,
            "b": 4,
        }), 2)

    def test_hermite_missing_derivatives(self):
        result = api(INTERP, {
            "method": "hermite",
            "x_pts": [0, 1],
            "y_pts": [0, 1],
            "x_eval": 0.5,
        })

        self.assertFalse(result["success"])
        self.assertIn("derivada", result["error"])

    def test_horner_preserves_precision(self):
        result = api(POLY, {
            "method": "horner",
            "coeffs": [1e-10, 0, -2e-10],
            "x0": 2,
        })

        self.assertTrue(result["success"])

        self.assertTrue(math.isclose(
            result["p_x0"], 2e-10,
            rel_tol=1e-12,
            abs_tol=0,
        ))

        self.assertTrue(math.isclose(
            result["dp_x0"], 4e-10,
            rel_tol=1e-12,
            abs_tol=0,
        ))

        self.assertEqual(
            result["quotient_coeffs"],
            [1e-10, 2e-10],
        )

    def test_false_position_scaled_function(self):
        self.assertRoot(api(ROOT, {
            "method": "false_position",
            "expression": "1e-20*(x^2-2)",
            "a": 1,
            "b": 2,
        }), math.sqrt(2))

    def test_scaled_open_root_methods(self):
        for method, params in [
            ("newton", {"x0": 1.5}),
            ("secant", {"x0": 1, "x1": 2}),
        ]:
            with self.subTest(method=method):
                self.assertRoot(api(ROOT, {
                    "method": method,
                    "expression": "1e-20*(x^2-2)",
                    **params,
                }), math.sqrt(2))
