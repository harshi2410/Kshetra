from fastapi import APIRouter
from app.api.v1.endpoints import projects, layout_review, ground_truth, benchmark, layout_generation, ai_pipeline

api_router = APIRouter()
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(layout_generation.router, prefix="", tags=["Layout Generation"])
api_router.include_router(ai_pipeline.router, prefix="", tags=["AI Pipeline"])
api_router.include_router(layout_review.router, prefix="/projects", tags=["Layout Review & Approval"])
api_router.include_router(ground_truth.router, prefix="/projects", tags=["Ground Truth Datasets"])
api_router.include_router(benchmark.router, prefix="", tags=["Benchmark Engine"])
