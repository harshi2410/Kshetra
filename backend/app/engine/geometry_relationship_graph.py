import logging
from typing import Dict, Any, List
from app.engine.geometry_engine import GeometryEngine

logger = logging.getLogger(__name__)

class GeometryRelationshipGraphEngine:
    """
    Geometry Relationship Graph Engine Singleton (TASK-044 / TASK-055)
    Computes exact GEOS spatial relationships (CONTAINS, INSIDE, TOUCHES, SHARED_EDGE,
    OVERLAPS, INTERSECTS, NEIGHBOR, DISJOINT) using Shapely topology predicates.
    """

    def compute_relationship_graph(self, universal_primitives_dict: Dict[str, Any]) -> Dict[str, Any]:
        primitives = universal_primitives_dict.get("universalPrimitives", []) or universal_primitives_dict.get("primitives", [])
        nodes: List[Dict[str, Any]] = []
        shapely_map = {}

        # 1. Build Node list & Shapely Polygon Cache
        for p in primitives:
            p_id = p.get("id") or p.get("primitiveId")
            verts = p.get("vertices", [])
            if not verts and p.get("boundingBox"):
                bbox = p.get("boundingBox")
                if len(bbox) == 4:
                    verts = [
                        [float(bbox[0]), float(bbox[1])],
                        [float(bbox[2]), float(bbox[1])],
                        [float(bbox[2]), float(bbox[3])],
                        [float(bbox[0]), float(bbox[3])],
                        [float(bbox[0]), float(bbox[1])]
                    ]
            poly, clean_verts, is_valid = GeometryEngine.to_shapely_polygon(verts)
            shapely_map[p_id] = poly

            nodes.append({
                "id": p_id,
                "primitiveType": p.get("primitiveType", "POLYGON"),
                "candidateType": p.get("candidateType", "UNKNOWN"),
                "isClosed": p.get("isClosed", False),
                "isValid": is_valid,
                "boundingBox": p.get("boundingBox", [0.0, 0.0, 0.0, 0.0]),
                "area": p.get("area", 0.0),
                "perimeter": p.get("perimeter", 0.0)
            })

        n_count = len(nodes)
        edges: List[Dict[str, Any]] = []
        counts = {"contains": 0, "intersects": 0, "touches": 0, "sharedEdge": 0, "neighbor": 0}

        # 2. Pairwise GEOS Spatial Relationship Computation
        for i in range(n_count):
            node_a = nodes[i]
            id_a = node_a["id"]
            poly_a = shapely_map.get(id_a)

            for j in range(i + 1, n_count):
                node_b = nodes[j]
                id_b = node_b["id"]
                poly_b = shapely_map.get(id_b)

                if poly_a and poly_b:
                    pred = GeometryEngine.compute_spatial_predicate(poly_a, poly_b)
                    rel = pred["relationship"]
                    dist = pred["distance"]
                    shared_len = pred["sharedLength"]
                    overlap_area = pred["overlapArea"]

                    if rel == "CONTAINS":
                        counts["contains"] += 1
                        edges.append({"sourceId": id_a, "targetId": id_b, "relationshipType": "CONTAINS", "distance": dist})
                        edges.append({"sourceId": id_b, "targetId": id_a, "relationshipType": "INSIDE", "distance": dist})
                    elif rel == "INSIDE":
                        counts["contains"] += 1
                        edges.append({"sourceId": id_a, "targetId": id_b, "relationshipType": "INSIDE", "distance": dist})
                        edges.append({"sourceId": id_b, "targetId": id_a, "relationshipType": "CONTAINS", "distance": dist})
                    elif rel in ["TOUCHES", "SHARED_EDGE", "OVERLAPS", "INTERSECTS"]:
                        counts["intersects"] += 1
                        if rel in ["TOUCHES", "SHARED_EDGE"]:
                            counts["touches"] += 1
                            counts["sharedEdge"] += 1
                        edges.append({
                            "sourceId": id_a,
                            "targetId": id_b,
                            "relationshipType": rel,
                            "distance": dist,
                            "sharedLength": shared_len,
                            "overlapArea": overlap_area
                        })
                    elif rel == "NEIGHBOR":
                        counts["neighbor"] += 1
                        edges.append({"sourceId": id_a, "targetId": id_b, "relationshipType": rel, "distance": dist})

        result = {
            "artifactType": "GEOMETRY_RELATIONSHIP_GRAPH",
            "nodesCount": n_count,
            "edgesCount": len(edges),
            "containsRelationshipsCount": counts["contains"],
            "intersectsRelationshipsCount": counts["intersects"],
            "touchesRelationshipsCount": counts["touches"],
            "sharedEdgeRelationshipsCount": counts["sharedEdge"],
            "neighborRelationshipsCount": counts["neighbor"],
            "nodes": nodes,
            "edges": edges[:300]
        }

        logger.info(f"GeometryRelationshipGraphEngine GEOS completed: {n_count} nodes, {len(edges)} edges computed")
        return result

geometry_relationship_graph_instance = GeometryRelationshipGraphEngine()
