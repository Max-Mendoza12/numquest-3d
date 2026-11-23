from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from core.parser import build_function
from methods.unit1_roots import (
    analyze_float,
    bisection_method,
    false_position_method,
    fixed_point_method,
    newton_raphson_method,
    secant_method,
    muller_method,
    bairstow_method,
)

app = FastAPI(title="NumQuest 3D - Motor Matemático", version="1.0")

# Permite que la web y las Meta Quest 3 se conecten sin bloqueos de seguridad
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos de datos que recibirá cada método
class RootRequest(BaseModel):
    method: str  # bisection, false_position, fixed_point, newton, secant, muller
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


@app.get("/")
def root():
    return {"status": "online", "message": "Motor NumQuest 3D activo"}


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
        elif req.method == "secant":
            res = secant_method(f, req.x0, req.x1, req.tol, req.max_iter)
        elif req.method == "muller":
            res = muller_method(f, req.x0, req.x1, req.x2, req.tol, req.max_iter)
        else:
            raise HTTPException(status_code=400, detail="Método no reconocido")

        res["latex"] = parsed["latex"]
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/unit1/bairstow")
def solve_bairstow(req: BairstowRequest):
    return bairstow_method(req.coeffs, req.r, req.s, req.tol, req.max_iter)