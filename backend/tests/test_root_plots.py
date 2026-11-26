import math
import unittest

from test_math_api import api, ROOT


class RootPlotTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.bisection = api(ROOT, {
            "method": "bisection",
            "expression": "x^2-2",
            "a": 1,
            "b": 2,
            "tol": 0.0001,
        })

        cls.secant = api(ROOT, {
            "method": "secant",
            "expression": "x^2-2",
            "x0": 1,
            "x1": 2,
            "tol": 0.0001,
        })

    def test_bisection_root(self):
        self.assertTrue(self.bisection["converged"])
        self.assertAlmostEqual(
            self.bisection["root"], math.sqrt(2), places=5
        )

    def test_bisection_midpoints(self):
        plot = self.bisection["plot"]
        self.assertEqual(plot["kind"], "bisection")

        for s in plot["steps"]:
            self.assertAlmostEqual(
                s["next_x"], (s["a"] + s["b"]) / 2
            )
            self.assertAlmostEqual(
                s["fx"], s["next_x"]**2 - 2
            )

    def test_bisection_interval_reduction(self):
        steps = self.bisection["plot"]["steps"]

        for previous, current in zip(steps, steps[1:]):
            self.assertAlmostEqual(
                abs(current["b"] - current["a"]),
                abs(previous["b"] - previous["a"]) / 2
            )

    def test_bisection_brackets(self):
        for s in self.bisection["plot"]["steps"]:
            self.assertLessEqual(s["fa"] * s["fb"], 0)

    def test_secant_root(self):
        self.assertTrue(self.secant["converged"])
        self.assertAlmostEqual(
            self.secant["root"], math.sqrt(2), places=5
        )

    def test_secant_geometry(self):
        plot = self.secant["plot"]
        self.assertEqual(plot["kind"], "secant")

        for s in plot["steps"]:
            self.assertAlmostEqual(
                s["previous_fx"], s["previous_x"]**2 - 2
            )
            self.assertAlmostEqual(
                s["fx"], s["x"]**2 - 2
            )

            expected_slope = (
                (s["fx"] - s["previous_fx"]) /
                (s["x"] - s["previous_x"])
            )

            self.assertAlmostEqual(s["slope"], expected_slope)
            self.assertAlmostEqual(
                s["next_x"], s["x"] - s["fx"] / s["slope"]
            )

    def test_plot_samples(self):
        for result in [self.bisection, self.secant]:
            plot = result["plot"]
            self.assertEqual(len(plot["samples"]), 241)

            for x, y in plot["samples"]:
                self.assertAlmostEqual(y, x*x-2)

    def test_adaptive_domain(self):
        for result in [self.bisection, self.secant]:
            plot = result["plot"]
            low, high = plot["domain"]

            for s in plot["steps"]:
                for key in ["a", "b", "x", "next_x", "previous_x"]:
                    if key in s:
                        self.assertTrue(low <= s[key] <= high)

    def test_invalid_bracket(self):
        result = api(ROOT, {
            "method": "bisection",
            "expression": "x^2+1",
            "a": 1,
            "b": 2,
        })

        self.assertFalse(result["converged"])
        self.assertIsNone(result["plot"])

    def test_nonconverged_secant(self):
        result = api(ROOT, {
            "method": "secant",
            "expression": "x^2-2",
            "x0": 1,
            "x1": 2,
            "max_iter": 1,
        })

        self.assertFalse(result["converged"])
        self.assertFalse(result["plot"]["converged"])
        self.assertEqual(len(result["plot"]["steps"]), 1)


if __name__ == "__main__":
    unittest.main()
