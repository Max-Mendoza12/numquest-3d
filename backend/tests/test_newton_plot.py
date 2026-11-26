import unittest
import math

from test_math_api import api, ROOT


class NewtonPlotTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.result = api(ROOT, {
            "method": "newton",
            "expression": "x^3-2*x-5",
            "x0": 2,
            "tol": 0.0001,
        })
        cls.plot = cls.result["plot"]

    def test_root(self):
        self.assertTrue(self.result["converged"])
        self.assertAlmostEqual(
            self.result["root"], 2.09455148, places=7
        )

    def test_sample_count(self):
        self.assertEqual(len(self.plot["samples"]), 241)

    def test_function_values(self):
        for x, y in self.plot["samples"]:
            self.assertTrue(math.isclose(
                y, x**3-2*x-5,
                rel_tol=1e-9,
                abs_tol=1e-9
            ))

    def test_tangent_values(self):
        for step in self.plot["steps"]:
            x = step["x"]
            self.assertAlmostEqual(
                step["fx"], x**3-2*x-5
            )
            self.assertAlmostEqual(
                step["slope"], 3*x*x-2
            )

    def test_newton_iterations(self):
        for step in self.plot["steps"]:
            expected = (
                step["x"] - step["fx"]/step["slope"]
            )
            self.assertAlmostEqual(
                step["next_x"], expected
            )

    def test_adaptive_domain(self):
        xmin, xmax = self.plot["domain"]

        for step in self.plot["steps"]:
            self.assertTrue(
                xmin <= step["x"] <= xmax
            )
            self.assertTrue(
                xmin <= step["next_x"] <= xmax
            )

    def test_adaptive_range(self):
        ymin, ymax = self.plot["range"]

        for _, y in self.plot["samples"]:
            if y is not None:
                self.assertTrue(ymin <= y <= ymax)

        self.assertTrue(ymin <= 0 <= ymax)


if __name__ == "__main__":
    unittest.main()
