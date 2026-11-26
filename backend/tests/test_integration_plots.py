import unittest

from test_math_api import api, CALC


METHODS = [
    "trapezoid",
    "simpson_1_3",
    "simpson_3_8",
]


def calculate(method, expression="x^2", a=0, b=3, n=6):
    return api(CALC, {
        "method": method,
        "expression": expression,
        "a": a,
        "b": b,
        "n": n,
    })


class IntegrationPlotTests(unittest.TestCase):

    def test_trapezoid_result(self):
        result = calculate("trapezoid")
        self.assertAlmostEqual(result["integral"], 9.125)

    def test_simpson_results(self):
        for method in METHODS[1:]:
            result = calculate(method)
            self.assertAlmostEqual(result["integral"], 9)

    def test_block_counts(self):
        for method, expected in zip(METHODS, [6, 3, 2]):
            result = calculate(method)
            plot = result["plot"]

            self.assertEqual(plot["kind"], method)
            self.assertEqual(len(plot["steps"]), expected)
            self.assertEqual(len(plot["samples"]), 241)

    def test_accumulated_integral(self):
        for method in METHODS:
            result = calculate(method)
            total = 0

            for step in result["plot"]["steps"]:
                total += step["contribution"]
                self.assertAlmostEqual(total, step["value"])

            self.assertAlmostEqual(total, result["integral"])

    def test_approximation_geometry(self):
        for method in METHODS:
            result = calculate(method)
            plot = result["plot"]

            for block in plot["steps"]:
                left, right = block["a"], block["b"]

                for x, y in block["points"]:
                    if method == "trapezoid":
                        expected = (
                            left**2
                            + (right**2-left**2)
                            * (x-left)/(right-left)
                        )
                    else:
                        expected = x*x

                    self.assertAlmostEqual(y, expected)

    def test_negative_integral(self):
        for method in METHODS:
            result = calculate(method, expression="-2")
            self.assertAlmostEqual(result["integral"], -6)

            for step in result["plot"]["steps"]:
                self.assertLess(step["contribution"], 0)

    def test_reversed_limits(self):
        for method in METHODS:
            forward = calculate(method)
            reverse = calculate(method, a=3, b=0)

            self.assertAlmostEqual(
                reverse["integral"],
                -forward["integral"]
            )

            self.assertEqual(
                reverse["plot"]["direction"], -1
            )

    def test_crossing_zero(self):
        for method in METHODS:
            result = calculate(
                method, expression="x", a=-1, b=1
            )

            self.assertAlmostEqual(result["integral"], 0)

            values = [
                step["contribution"]
                for step in result["plot"]["steps"]
            ]

            self.assertTrue(any(v < 0 for v in values))
            self.assertTrue(any(v > 0 for v in values))

    def test_adaptive_bounds(self):
        for method in METHODS:
            plot = calculate(method)["plot"]

            xmin, xmax = plot["domain"]
            ymin, ymax = plot["range"]

            points = plot["samples"] + plot["nodes"]

            for step in plot["steps"]:
                points.extend(step["points"])

            for x, y in points:
                self.assertTrue(xmin <= x <= xmax)
                self.assertTrue(ymin <= y <= ymax)

            self.assertTrue(ymin <= 0 <= ymax)

    def test_invalid_subintervals(self):
        for method, n in [
            ("trapezoid", 0),
            ("simpson_1_3", 5),
            ("simpson_3_8", 4),
        ]:
            result = calculate(method, n=n)
            self.assertFalse(result["success"])
            self.assertIsNone(result.get("plot"))

    def test_visualization_limit(self):
        for method in METHODS:
            result = calculate(method, n=78)
            self.assertTrue(result["success"])
            self.assertIsNone(result["plot"])

    def test_zero_length_interval(self):
        for method in METHODS:
            result = calculate(method, a=2, b=2)
            self.assertAlmostEqual(result["integral"], 0)
            self.assertIsNone(result["plot"])


if __name__ == "__main__":
    unittest.main()
