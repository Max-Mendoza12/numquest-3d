import unittest

from test_math_api import api, INTERP


def calculate(method, x_eval=1.5, xs=None, ys=None):
    return api(INTERP, {
        "method": method,
        "x_pts": xs if xs is not None else [0, 1, 2, 3],
        "y_pts": ys if ys is not None else [0, 1, 4, 9],
        "x_eval": x_eval,
    })


class InterpolationPlotTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.lagrange = calculate("lagrange")
        cls.neville = calculate("neville")

    def test_lagrange_result(self):
        self.assertTrue(self.lagrange["success"])
        self.assertAlmostEqual(self.lagrange["y_eval"], 2.25)

    def test_neville_result(self):
        self.assertTrue(self.neville["success"])
        self.assertAlmostEqual(self.neville["y_eval"], 2.25)

    def test_sample_count(self):
        for result in [self.lagrange, self.neville]:
            self.assertEqual(len(result["plot"]["samples"]), 241)

    def test_real_curve(self):
        for result in [self.lagrange, self.neville]:
            for x, y in result["plot"]["samples"]:
                self.assertAlmostEqual(y, x*x, places=8)

    def test_original_nodes(self):
        for result in [self.lagrange, self.neville]:
            self.assertEqual(
                result["plot"]["nodes"],
                [[0, 0], [1, 1], [2, 4], [3, 9]]
            )

    def test_lagrange_accumulated_sum(self):
        plot = self.lagrange["plot"]
        total = 0

        self.assertEqual(plot["kind"], "lagrange")

        for step in plot["steps"]:
            total += step["contribution"]
            self.assertAlmostEqual(step["value"], total)

        self.assertAlmostEqual(total, 2.25)

    def test_neville_orders(self):
        plot = self.neville["plot"]
        table = self.neville["neville_table"]

        self.assertEqual(plot["kind"], "neville")

        for j, step in enumerate(plot["steps"]):
            self.assertEqual(step["order"], j)
            self.assertEqual(len(step["node_indices"]), j + 1)
            self.assertAlmostEqual(
                step["value"], table[-1]["values"][j]
            )

        self.assertAlmostEqual(
            plot["steps"][-1]["value"], 2.25
        )

    def test_adaptive_bounds(self):
        for result in [self.lagrange, self.neville]:
            plot = result["plot"]
            xmin, xmax = plot["domain"]
            ymin, ymax = plot["range"]

            for x, y in plot["samples"] + plot["nodes"]:
                self.assertTrue(xmin <= x <= xmax)
                self.assertTrue(ymin <= y <= ymax)

            x, y = plot["evaluation"]
            self.assertTrue(xmin <= x <= xmax)
            self.assertTrue(ymin <= y <= ymax)

    def test_extrapolation(self):
        for method in ["lagrange", "neville"]:
            result = calculate(method, x_eval=4)
            self.assertAlmostEqual(result["y_eval"], 16)
            self.assertTrue(result["plot"]["extrapolation"])
            self.assertEqual(
                result["plot"]["evaluation"], [4, 16]
            )

    def test_duplicate_nodes(self):
        for method in ["lagrange", "neville"]:
            result = calculate(
                method, xs=[0, 1, 1], ys=[0, 1, 4]
            )
            self.assertFalse(result["success"])
            self.assertIsNone(result.get("plot"))

    def test_unsorted_nodes(self):
        for method in ["lagrange", "neville"]:
            result = calculate(
                method, xs=[3, 0, 2, 1],
                ys=[9, 0, 4, 1]
            )
            self.assertAlmostEqual(result["y_eval"], 2.25)
            self.assertEqual(
                result["plot"]["nodes"],
                [[0, 0], [1, 1], [2, 4], [3, 9]]
            )


if __name__ == "__main__":
    unittest.main()
