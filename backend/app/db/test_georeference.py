import pytest
from app.engine.universal_layout_reconstruction_engine import universal_layout_reconstruction_engine_instance
from app.engine.facing_calculator import facing_calculator_instance

def test_default_georeference_state():
    labeled_layout = {"plots": [], "roads": []}
    road_network = {"roads": []}
    boundary = {"boundaryId": "b-01", "geometry": []}
    detected = {"plots": []}
    
    model = universal_layout_reconstruction_engine_instance.reconstruct_universal_layout(
        labeled_layout, road_network, boundary, detected
    )
    
    geo = model.get("metadata", {}).get("georeference", {})
    assert geo.get("status") == "UNCONFIGURED"
    assert geo.get("provider") == "OSM"
    assert geo.get("scale") == 1

def test_facing_calculation():
    plot = {
        "polygon": [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        "centroid": [5, 5]
    }
    
    # Road is to the East (X=15)
    roads = [
        {"centerline": [[15, -10], [15, 20]]}
    ]
    
    facing = facing_calculator_instance.calculate_plot_facing(plot, roads, 0.0)
    assert facing == "E"

    # With 90 degree global rotation (map is rotated)
    # The East-facing plot (90 azimuth) + 90 rotation = 180 azimuth = South
    facing_rot = facing_calculator_instance.calculate_plot_facing(plot, roads, 90.0)
    assert facing_rot == "S"
    
def test_unknown_facing_when_geometry_insufficient():
    # Plot missing geometry
    plot = {"polygon": []}
    roads = [{"centerline": [[15, -10], [15, 20]]}]
    assert facing_calculator_instance.calculate_plot_facing(plot, roads) == "UNKNOWN"

    # Road is too far away (dist > 500)
    plot2 = {"polygon": [[0, 0], [10, 0], [10, 10], [0, 10]]}
    roads2 = [{"centerline": [[1000, 0], [1000, 10]]}]
    assert facing_calculator_instance.calculate_plot_facing(plot2, roads2) == "UNKNOWN"
