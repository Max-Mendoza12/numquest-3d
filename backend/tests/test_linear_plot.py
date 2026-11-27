import unittest
import math

from test_math_api import api, LINEAR


class LinearPlotTests(unittest.TestCase):

    def test_three_pivoting_modes(self):
        A = [
            [3, -0.1, -0.2],
            [0.1, 7, -0.3],
            [0.3, -0.2, 10],
        ]

        b = [7.85, -19.3, 71.4]

        for pivoting in ["trivial", "partial", "scaled"]:
            with self.subTest(pivoting=pivoting):
                result = api(LINEAR, {
                    "A": A,
                    "b": b,
                    "pivoting": pivoting,
                })

                self.assertTrue(result["success"])

                plot = result["plot"]

                self.assertEqual(plot["kind"], "linear_system")
                self.assertEqual(len(plot["steps"]), 4)

                for actual, expected in zip(
                    plot["solution"], [3, -2.5, 7]
                ):
                    self.assertAlmostEqual(actual, expected)

                # Cada matriz debe conservar la solucion.
                for step in plot["steps"]:
                    for row in step["matrix"]:
                        calculated = sum(
                            row[i] * plot["solution"][i]
                            for i in range(3)
                        )

                        self.assertTrue(math.isclose(
                            calculated,
                            row[3],
                            abs_tol=1e-8,
                            rel_tol=1e-8,
                        ))

    def test_row_swap(self):
        result = api(LINEAR, {
            "A": [[0, 1, 0], [1, 0, 0], [0, 0, 1]],
            "b": [2, 1, 3],
            "pivoting": "partial",
        })

        self.assertTrue(result["success"])
        self.assertEqual(result["plot"]["solution"], [1, 2, 3])
        self.assertTrue(result["plot"]["steps"][1]["swapped"])

    def test_four_variables_preserve_solver(self):
        result = api(LINEAR, {
            "A": [
                [1, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 0, 1, 0],
                [0, 0, 0, 1],
            ],
            "b": [1, 2, 3, 4],
            "pivoting": "partial",
        })

        self.assertTrue(result["success"])
        self.assertEqual(result["solution"], [1, 2, 3, 4])
        self.assertNotIn("plot", result)

    def test_singular_system_has_no_false_solution(self):
        result = api(LINEAR, {
            "A": [[1, 1, 1], [2, 2, 2], [3, 3, 3]],
            "b": [1, 2, 3],
            "pivoting": "partial",
        })

        self.assertFalse(result["success"])
        self.assertNotIn("plot", result)
