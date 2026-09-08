import os
import sys
import tempfile
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.geometry_relationship_graph import geometry_relationship_graph_instance

def run_geometry_relationship_graph_tests():
    print("=" * 60)
    print("RUNNING TASK-044 GEOMETRY RELATIONSHIP GRAPH ENGINE TEST SUITE")
    print("=" * 60)

    # 1. CONTAINMENT TEST CASE (Outer boundary contains inner plot)
    primitives_containment = {
        "universalPrimitives": [
            {
                "id": "outer-boundary-1",
                "primitiveType": "POLYGON",
                "candidateType": "BOUNDARY_CANDIDATE",
                "isClosed": True,
                "boundingBox": [0.0, 0.0, 1000.0, 800.0],
                "area": 800000.0,
                "perimeter": 3600.0
            },
            {
                "id": "inner-plot-1",
                "primitiveType": "POLYGON",
                "candidateType": "PLOT_CANDIDATE",
                "isClosed": True,
                "boundingBox": [200.0, 200.0, 400.0, 400.0],
                "area": 40000.0,
                "perimeter": 800.0
            }
        ]
    }
    graph_containment = geometry_relationship_graph_instance.compute_relationship_graph(primitives_containment)
    print(f"[1] Containment Analysis PASSED:")
    print(f"    Nodes = {graph_containment['nodesCount']} | Edges = {graph_containment['edgesCount']} | Contains Edges = {graph_containment['containsRelationshipsCount']}")
    assert graph_containment["artifactType"] == "GEOMETRY_RELATIONSHIP_GRAPH"
    assert graph_containment["nodesCount"] == 2
    assert graph_containment["containsRelationshipsCount"] >= 1
    rel_types = [e["relationshipType"] for e in graph_containment["edges"]]
    assert "CONTAINS" in rel_types
    assert "INSIDE" in rel_types

    # 2. SHARED EDGE & TOUCHES TEST CASE (Two adjacent plot polygons)
    primitives_shared_edge = {
        "universalPrimitives": [
            {
                "id": "plot-a",
                "primitiveType": "POLYGON",
                "candidateType": "PLOT_CANDIDATE",
                "isClosed": True,
                "boundingBox": [100.0, 100.0, 200.0, 200.0],
                "area": 10000.0,
                "perimeter": 400.0
            },
            {
                "id": "plot-b",
                "primitiveType": "POLYGON",
                "candidateType": "PLOT_CANDIDATE",
                "isClosed": True,
                "boundingBox": [200.0, 100.0, 300.0, 200.0], # Sharing boundary line at x=200
                "area": 10000.0,
                "perimeter": 400.0
            }
        ]
    }
    graph_shared_edge = geometry_relationship_graph_instance.compute_relationship_graph(primitives_shared_edge)
    print(f"[2] Shared Edge & Touches PASSED:")
    print(f"    Shared Edge Count = {graph_shared_edge['sharedEdgeRelationshipsCount']} | Intersects Count = {graph_shared_edge['intersectsRelationshipsCount']}")
    assert graph_shared_edge["sharedEdgeRelationshipsCount"] >= 1 or graph_shared_edge["intersectsRelationshipsCount"] >= 1

    # 3. ADJACENCY / NEIGHBOR TEST CASE (Nearby primitives within distance threshold)
    primitives_neighbor = {
        "universalPrimitives": [
            {
                "id": "plot-x",
                "primitiveType": "POLYGON",
                "candidateType": "PLOT_CANDIDATE",
                "isClosed": True,
                "boundingBox": [100.0, 100.0, 200.0, 200.0]
            },
            {
                "id": "plot-y",
                "primitiveType": "POLYGON",
                "candidateType": "PLOT_CANDIDATE",
                "isClosed": True,
                "boundingBox": [240.0, 100.0, 340.0, 200.0] # 40px gap
            }
        ]
    }
    graph_neighbor = geometry_relationship_graph_instance.compute_relationship_graph(primitives_neighbor)
    print(f"[3] Adjacency / Neighbor Detection PASSED:")
    print(f"    Neighbor Edges Count = {graph_neighbor['neighborRelationshipsCount']}")
    assert graph_neighbor["neighborRelationshipsCount"] >= 1

    # 4. EMPTY INPUT TEST CASE (NO CRASH GUARANTEE)
    empty_dict = {}
    graph_empty = geometry_relationship_graph_instance.compute_relationship_graph(empty_dict)
    print(f"[4] Empty Input Graph Generation PASSED (No Crash):")
    print(f"    Nodes = {graph_empty['nodesCount']} | Edges = {graph_empty['edgesCount']}")
    assert graph_empty["artifactType"] == "GEOMETRY_RELATIONSHIP_GRAPH"
    assert graph_empty["nodesCount"] == 0
    assert graph_empty["edgesCount"] == 0

    print("=" * 60)
    print("ALL TASK-044 GEOMETRY RELATIONSHIP GRAPH ENGINE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_geometry_relationship_graph_tests()
