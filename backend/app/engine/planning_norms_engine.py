"""
Planning Norms & Government Regulations Engine.
Provides comprehensive Maharashtra Unified Development Control and Promotion Regulations (UDCPR 2020),
jurisdiction-specific local planning regulations (PMC, PCMC, BMC, CIDCO, PMRDA, MMRDA, Municipal Councils,
Nagar Panchayats, Regional Plans), and multi-state planning baselines.

Enforces:
- UDCPR Rule 3.3: Road widths & hierarchies (6.0m congested, 9.0m, 12.0m, 15.0m non-congested)
- UDCPR Rule 3.4: Recreational Open Space (10% for layouts >= 0.40 Ha, min 400 sqm single area, min 7.5m width)
- UDCPR Rule 3.5: Civic Amenity Space (5% for layouts >= 2.0 Ha or per municipal corporation DP)
- UDCPR Rule 3.6 & 3.7: Minimum plot dimensions, frontage, and plot categories
- UDCPR Rule 6.1 & 6.2: Peripheral boundary setbacks and front/rear/side margins
- Ground Utility / Infrastructure reservations (substations, solid waste, drainage corridors)
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


SQM_TO_SQFT = 10.7639104
SQFT_TO_SQM = 1.0 / 10.7639104
M_TO_FT = 3.2808399
FT_TO_M = 1.0 / 3.2808399
HECTARE_TO_SQM = 10000.0
ACRE_TO_SQFT = 43560.0


class MaharashtraAuthorityInfo(BaseModel):
    id: str
    name: str
    shortName: str
    category: str  # MUNICIPAL_CORPORATION | DEVELOPMENT_AUTHORITY | MUNICIPAL_COUNCIL | NAGAR_PANCHAYAT | REGIONAL_PLAN
    cityDistrict: str
    governingAct: str
    applicableRegulation: str
    amenityThresholdHa: float = 2.0
    notes: str = ""


# Comprehensive Maharashtra Planning Authorities Registry (13C)
MAHARASHTRA_AUTHORITIES: Dict[str, MaharashtraAuthorityInfo] = {
    "IN_MH_PMC": MaharashtraAuthorityInfo(
        id="IN_MH_PMC",
        name="Pune Municipal Corporation (PMC)",
        shortName="PMC Pune",
        category="MUNICIPAL_CORPORATION",
        cityDistrict="Pune",
        governingAct="Maharashtra Municipal Corporations Act (MMCA)",
        applicableRegulation="UDCPR 2020 + PMC Development Plan Regulations",
        amenityThresholdHa=0.40,  # PMC mandates amenity space from 0.4 Ha in developing sectors
        notes="Non-congested standard internal road 9.0m. Gaothan/congested 6.0m."
    ),
    "IN_MH_PCMC": MaharashtraAuthorityInfo(
        id="IN_MH_PCMC",
        name="Pimpri-Chinchwad Municipal Corporation (PCMC)",
        shortName="PCMC",
        category="MUNICIPAL_CORPORATION",
        cityDistrict="Pimpri-Chinchwad / Pune",
        governingAct="Maharashtra Municipal Corporations Act (MMCA)",
        applicableRegulation="UDCPR 2020 + PCMC Sanctioned Development Plan",
        amenityThresholdHa=0.40,
        notes="High industrial-residential mix standards with mandatory utility easements."
    ),
    "IN_MH_BMC": MaharashtraAuthorityInfo(
        id="IN_MH_BMC",
        name="Brihanmumbai Municipal Corporation (BMC / MCGM)",
        shortName="BMC Mumbai",
        category="MUNICIPAL_CORPORATION",
        cityDistrict="Mumbai City & Suburban",
        governingAct="Mumbai Municipal Corporation Act 1888",
        applicableRegulation="Development Control and Promotion Regulations for Greater Mumbai 2034 (DCPR 2034)",
        amenityThresholdHa=0.40,
        notes="High density island/suburban norms under DCPR 2034 Regulation 27 & 28."
    ),
    "IN_MH_PMRDA": MaharashtraAuthorityInfo(
        id="IN_MH_PMRDA",
        name="Pune Metropolitan Region Development Authority (PMRDA)",
        shortName="PMRDA",
        category="DEVELOPMENT_AUTHORITY",
        cityDistrict="Pune Metropolitan Region",
        governingAct="Maharashtra Metropolitan Region Development Authority Act 2016",
        applicableRegulation="UDCPR 2020 + PMRDA Regional Development Plan",
        amenityThresholdHa=1.0,
        notes="Peri-urban plotted layout standards. 10% Recreational Open Space strictly contiguous."
    ),
    "IN_MH_MMRDA": MaharashtraAuthorityInfo(
        id="IN_MH_MMRDA",
        name="Mumbai Metropolitan Region Development Authority (MMRDA)",
        shortName="MMRDA",
        category="DEVELOPMENT_AUTHORITY",
        cityDistrict="MMR Region (Thane, Raigad, Palghar)",
        governingAct="MMRDA Act 1974",
        applicableRegulation="UDCPR 2020 + MMR Regional Plan Norms",
        amenityThresholdHa=2.0,
        notes="Regional growth centers and peri-urban plotted layouts."
    ),
    "IN_MH_NMMC": MaharashtraAuthorityInfo(
        id="IN_MH_NMMC",
        name="Navi Mumbai Municipal Corporation / CIDCO",
        shortName="NMMC / CIDCO",
        category="MUNICIPAL_CORPORATION",
        cityDistrict="Navi Mumbai / Thane",
        governingAct="MMCA & CIDCO Special Planning Authority Charter",
        applicableRegulation="UDCPR 2020 + CIDCO Development Control Regulations",
        amenityThresholdHa=1.0,
        notes="CIDCO nodal layout geometry with planned utility corridors."
    ),
    "IN_MH_TMC": MaharashtraAuthorityInfo(
        id="IN_MH_TMC",
        name="Thane Municipal Corporation (TMC)",
        shortName="TMC Thane",
        category="MUNICIPAL_CORPORATION",
        cityDistrict="Thane",
        governingAct="Maharashtra Municipal Corporations Act",
        applicableRegulation="UDCPR 2020 + Thane DP",
        amenityThresholdHa=0.40,
        notes="Urban composite norms with DP reservation alignment."
    ),
    "IN_MH_NMC": MaharashtraAuthorityInfo(
        id="IN_MH_NMC",
        name="Nagpur Municipal Corporation (NMC) / NIT",
        shortName="NMC Nagpur",
        category="MUNICIPAL_CORPORATION",
        cityDistrict="Nagpur",
        governingAct="MMCA & Nagpur Improvement Trust Act",
        applicableRegulation="UDCPR 2020 + NIT Plotted Scheme Regulations",
        amenityThresholdHa=1.0,
        notes="Vidarbha urban plotted scheme baselines."
    ),
    "IN_MH_NASHIK": MaharashtraAuthorityInfo(
        id="IN_MH_NASHIK",
        name="Nashik Municipal Corporation (NMC)",
        shortName="NMC Nashik",
        category="MUNICIPAL_CORPORATION",
        cityDistrict="Nashik",
        governingAct="Maharashtra Municipal Corporations Act",
        applicableRegulation="UDCPR 2020 + Nashik DP",
        amenityThresholdHa=1.0,
        notes="Standard UDCPR plotted layout norms with 9.0m minimum internal roads."
    ),
    "IN_MH_CSN": MaharashtraAuthorityInfo(
        id="IN_MH_CSN",
        name="Chhatrapati Sambhajinagar Municipal Corporation (AMC)",
        shortName="AMC Sambhajinagar",
        category="MUNICIPAL_CORPORATION",
        cityDistrict="Chhatrapati Sambhajinagar (Aurangabad)",
        governingAct="Maharashtra Municipal Corporations Act",
        applicableRegulation="UDCPR 2020 + AMC DP",
        amenityThresholdHa=1.0,
        notes="Marathwada regional center plotted development guidelines."
    ),
    "IN_MH_COUNCILS": MaharashtraAuthorityInfo(
        id="IN_MH_COUNCILS",
        name="Maharashtra Municipal Councils (Class 'A', 'B', 'C')",
        shortName="MH Municipal Councils",
        category="MUNICIPAL_COUNCIL",
        cityDistrict="Baramati, Lonavala, Satara, Kolhapur, etc.",
        governingAct="Maharashtra Municipal Councils, Nagar Panchayats & Industrial Townships Act",
        applicableRegulation="UDCPR 2020 Standard Urban Council Regulations",
        amenityThresholdHa=2.0,
        notes="Applicable to 240+ Municipal Council towns across Maharashtra."
    ),
    "IN_MH_NAGAR_PANCHAYAT": MaharashtraAuthorityInfo(
        id="IN_MH_NAGAR_PANCHAYAT",
        name="Maharashtra Nagar Panchayats & Growth Centers",
        shortName="Nagar Panchayats",
        category="NAGAR_PANCHAYAT",
        cityDistrict="Small Urban & Transition Towns across Maharashtra",
        governingAct="Maharashtra Municipal Councils & Nagar Panchayats Act",
        applicableRegulation="UDCPR 2020 Small Town Plotted Provisions",
        amenityThresholdHa=2.0,
        notes="Adapted for transition zones and small town residential layouts."
    ),
    "IN_MH_REGIONAL_PLAN": MaharashtraAuthorityInfo(
        id="IN_MH_REGIONAL_PLAN",
        name="Maharashtra Regional Plan (Rural NA Layouts under MLRC)",
        shortName="Regional Plan / Collectorate",
        category="REGIONAL_PLAN",
        cityDistrict="District Collectorates / Town Planning Offices",
        governingAct="Maharashtra Regional & Town Planning Act 1966 (MRTP) & MLRC 1966",
        applicableRegulation="UDCPR 2020 Chapter 3 Plotted Layouts in Regional Plan",
        amenityThresholdHa=2.0,
        notes="Non-Agricultural (NA) plotted layouts outside municipal boundaries."
    ),
    "IN_MH_UDCPR_STANDARD": MaharashtraAuthorityInfo(
        id="IN_MH_UDCPR_STANDARD",
        name="Unified Development Control and Promotion Regulations (UDCPR 2020)",
        shortName="UDCPR Standard",
        category="MUNICIPAL_CORPORATION",
        cityDistrict="Statewide Maharashtra Baseline",
        governingAct="Maharashtra Regional & Town Planning Act 1966 (MRTP)",
        applicableRegulation="UDCPR 2020 Notification No. TPS-1818/CR-236/18/DP/UD-13",
        amenityThresholdHa=2.0,
        notes="Official baseline applicable to all planning authorities in Maharashtra."
    ),
}


class PlanningNormsPreset(BaseModel):
    id: str
    name: str
    country: str = "India"
    state: str = "Maharashtra"
    authority: str
    landUse: str = "Residential"
    projectType: str = "Plotted Development / Layout Subdivision"
    isOfficial: bool = True
    authorityCitation: str
    disclaimer: str = "Official Maharashtra UDCPR regulatory baseline. Verify municipal DP reservations."

    # Minimum Plot Metrics (Imperial & Metric)
    minPlotAreaSqft: float
    minPlotAreaSqm: float
    minFrontageFt: float
    minFrontageM: float
    minPlotDepthFt: float
    minPlotDepthM: float

    # Road Widths
    internalRoadWidthFt: float
    internalRoadWidthM: float
    mainRoadWidthFt: float
    mainRoadWidthM: float
    accessRoadWidthFt: float
    accessRoadWidthM: float

    # Setbacks / Buffers
    frontSetbackFt: float
    frontSetbackM: float
    rearSetbackFt: float
    rearSetbackM: float
    sideSetbackFt: float
    sideSetbackM: float
    outerBoundarySetbackFt: float
    outerBoundarySetbackM: float

    # Mandatory Space Allocations
    openSpacePercentage: float = Field(10.0, description="Mandatory public open space / park (%)")
    amenitySpacePercentage: float = Field(5.0, description="Community amenities / civic amenities (%)")
    utilitySpacePercentage: float = Field(1.0, description="Dedicated utility / electrical / waste space (%)")
    maxGroundCoveragePercent: float = Field(60.0, description="Max building footprint coverage (%)")


# Static presets catalog
PRESETS: Dict[str, PlanningNormsPreset] = {
    "IN_MH_PMC": PlanningNormsPreset(
        id="IN_MH_PMC",
        name="Pune Municipal Corporation (PMC) - UDCPR 2020",
        state="Maharashtra",
        authority="Pune Municipal Corporation (PMC)",
        landUse="Residential Plotted Layout",
        authorityCitation="UDCPR 2020 & PMC Sanctioned Development Plan",
        minPlotAreaSqft=1076.4,
        minPlotAreaSqm=100.0,
        minFrontageFt=19.68,
        minFrontageM=6.0,
        minPlotDepthFt=39.37,
        minPlotDepthM=12.0,
        internalRoadWidthFt=29.53,
        internalRoadWidthM=9.0,
        mainRoadWidthFt=39.37,
        mainRoadWidthM=12.0,
        accessRoadWidthFt=29.53,
        accessRoadWidthM=9.0,
        frontSetbackFt=9.84,
        frontSetbackM=3.0,
        rearSetbackFt=6.56,
        rearSetbackM=2.0,
        sideSetbackFt=6.56,
        sideSetbackM=2.0,
        outerBoundarySetbackFt=9.84,
        outerBoundarySetbackM=3.0,
        openSpacePercentage=10.0,
        amenitySpacePercentage=5.0,
        utilitySpacePercentage=1.0,
        maxGroundCoveragePercent=60.0
    ),
    "IN_MH_PCMC": PlanningNormsPreset(
        id="IN_MH_PCMC",
        name="Pimpri-Chinchwad Municipal Corporation (PCMC) - UDCPR 2020",
        state="Maharashtra",
        authority="Pimpri-Chinchwad Municipal Corporation",
        landUse="Residential Plotted Layout",
        authorityCitation="UDCPR 2020 & PCMC Development Plan",
        minPlotAreaSqft=1076.4,
        minPlotAreaSqm=100.0,
        minFrontageFt=19.68,
        minFrontageM=6.0,
        minPlotDepthFt=39.37,
        minPlotDepthM=12.0,
        internalRoadWidthFt=29.53,
        internalRoadWidthM=9.0,
        mainRoadWidthFt=39.37,
        mainRoadWidthM=12.0,
        accessRoadWidthFt=29.53,
        accessRoadWidthM=9.0,
        frontSetbackFt=9.84,
        frontSetbackM=3.0,
        rearSetbackFt=6.56,
        rearSetbackM=2.0,
        sideSetbackFt=6.56,
        sideSetbackM=2.0,
        outerBoundarySetbackFt=9.84,
        outerBoundarySetbackM=3.0,
        openSpacePercentage=10.0,
        amenitySpacePercentage=5.0,
        utilitySpacePercentage=1.0,
        maxGroundCoveragePercent=60.0
    ),
    "IN_MH_UDCPR": PlanningNormsPreset(
        id="IN_MH_UDCPR",
        name="Maharashtra UDCPR 2020 (Standard Baseline)",
        state="Maharashtra",
        authority="Directorate of Town Planning, Maharashtra",
        landUse="Residential Plotted Layout",
        authorityCitation="Unified Development Control and Promotion Regulations for Maharashtra State (Rule 3.3, 3.4 & 3.5)",
        minPlotAreaSqft=1076.4,   # 100 sqm
        minPlotAreaSqm=100.0,
        minFrontageFt=19.68,      # 6.0 m
        minFrontageM=6.0,
        minPlotDepthFt=39.37,     # 12.0 m
        minPlotDepthM=12.0,
        internalRoadWidthFt=29.53,# 9.0 m
        internalRoadWidthM=9.0,
        mainRoadWidthFt=39.37,    # 12.0 m
        mainRoadWidthM=12.0,
        accessRoadWidthFt=29.53,
        accessRoadWidthM=9.0,
        frontSetbackFt=9.84,      # 3.0 m
        frontSetbackM=3.0,
        rearSetbackFt=6.56,       # 2.0 m
        rearSetbackM=2.0,
        sideSetbackFt=6.56,       # 2.0 m
        sideSetbackM=2.0,
        outerBoundarySetbackFt=9.84,
        outerBoundarySetbackM=3.0,
        openSpacePercentage=10.0,
        amenitySpacePercentage=5.0,
        utilitySpacePercentage=1.0,
        maxGroundCoveragePercent=60.0
    ),
    "IN_KA_BDA": PlanningNormsPreset(
        id="IN_KA_BDA",
        name="Karnataka BDA / Planning Authority",
        country="India",
        state="Karnataka",
        authority="Bangalore Development Authority (BDA) / BMRDA",
        landUse="Residential Layout",
        authorityCitation="BDA Revised Master Plan (RMP-2015) Subdivision Regulations",
        disclaimer="Standard BDA layout norms. Verify specific zonal regulations and arterial road widths.",
        minPlotAreaSqft=1200.0,
        minPlotAreaSqm=111.5,
        minFrontageFt=30.0,
        minFrontageM=9.14,
        minPlotDepthFt=40.0,
        minPlotDepthM=12.19,
        internalRoadWidthFt=30.0,
        internalRoadWidthM=9.14,
        mainRoadWidthFt=40.0,
        mainRoadWidthM=12.19,
        accessRoadWidthFt=30.0,
        accessRoadWidthM=9.14,
        frontSetbackFt=10.0,
        frontSetbackM=3.05,
        rearSetbackFt=6.0,
        rearSetbackM=1.83,
        sideSetbackFt=6.0,
        sideSetbackM=1.83,
        outerBoundarySetbackFt=10.0,
        outerBoundarySetbackM=3.05,
        openSpacePercentage=15.0,
        amenitySpacePercentage=5.0,
        utilitySpacePercentage=1.0,
        maxGroundCoveragePercent=55.0
    ),
    "IN_TS_HMDA": PlanningNormsPreset(
        id="IN_TS_HMDA",
        name="Telangana HMDA / GHMC",
        country="India",
        state="Telangana",
        authority="Hyderabad Metropolitan Development Authority",
        landUse="Residential Plotted Layout",
        authorityCitation="Telangana Layout Rules (G.O.Ms.No. 168 & G.O.Ms.No. 86)",
        disclaimer="HMDA standard layout rules. Layout open space mortgage rules apply separately.",
        minPlotAreaSqft=1076.4,
        minPlotAreaSqm=100.0,
        minFrontageFt=20.0,
        minFrontageM=6.1,
        minPlotDepthFt=35.0,
        minPlotDepthM=10.67,
        internalRoadWidthFt=30.0,
        internalRoadWidthM=9.14,
        mainRoadWidthFt=40.0,
        mainRoadWidthM=12.19,
        accessRoadWidthFt=30.0,
        accessRoadWidthM=9.14,
        frontSetbackFt=10.0,
        frontSetbackM=3.05,
        rearSetbackFt=6.0,
        rearSetbackM=1.83,
        sideSetbackFt=6.0,
        sideSetbackM=1.83,
        outerBoundarySetbackFt=10.0,
        outerBoundarySetbackM=3.05,
        openSpacePercentage=10.0,
        amenitySpacePercentage=5.0,
        utilitySpacePercentage=1.0,
        maxGroundCoveragePercent=60.0
    ),
    "IN_TN_CMDA": PlanningNormsPreset(
        id="IN_TN_CMDA",
        name="Tamil Nadu CMDA / DTCP",
        country="India",
        state="Tamil Nadu",
        authority="Chennai Metropolitan Development Authority / DTCP",
        landUse="Residential Layout",
        authorityCitation="Tamil Nadu Combined Development and Building Rules (TNCDBR-2019)",
        disclaimer="TNCDBR layout rules. OSR (Open Space Reservation) gifting provisions apply for layouts > 3000 sqm.",
        minPlotAreaSqft=800.0,
        minPlotAreaSqm=74.3,
        minFrontageFt=20.0,
        minFrontageM=6.1,
        minPlotDepthFt=30.0,
        minPlotDepthM=9.14,
        internalRoadWidthFt=23.6,
        internalRoadWidthM=7.2,
        mainRoadWidthFt=32.8,
        mainRoadWidthM=10.0,
        accessRoadWidthFt=23.6,
        accessRoadWidthM=7.2,
        frontSetbackFt=9.8,
        frontSetbackM=3.0,
        rearSetbackFt=5.0,
        rearSetbackM=1.52,
        sideSetbackFt=5.0,
        sideSetbackM=1.52,
        outerBoundarySetbackFt=10.0,
        outerBoundarySetbackM=3.05,
        openSpacePercentage=10.0,
        amenitySpacePercentage=5.0,
        utilitySpacePercentage=1.0,
        maxGroundCoveragePercent=65.0
    ),
    "CUSTOM_CONFIGURABLE": PlanningNormsPreset(
        id="CUSTOM_CONFIGURABLE",
        name="User-Configurable Planning Norms",
        country="India",
        state="Custom / Applicable Jurisdiction",
        authority="Local Planning Authority / Licensed Surveyor",
        landUse="Residential Plotted Development",
        isOfficial=False,
        authorityCitation="Custom parameter set entered by user",
        disclaimer="User-configurable — verify with applicable planning authority before statutory submission.",
        minPlotAreaSqft=1200.0,
        minPlotAreaSqm=111.48,
        minFrontageFt=30.0,
        minFrontageM=9.14,
        minPlotDepthFt=40.0,
        minPlotDepthM=12.19,
        internalRoadWidthFt=30.0,
        internalRoadWidthM=9.14,
        mainRoadWidthFt=40.0,
        mainRoadWidthM=12.19,
        accessRoadWidthFt=24.0,
        accessRoadWidthM=7.32,
        frontSetbackFt=10.0,
        frontSetbackM=3.05,
        rearSetbackFt=6.0,
        rearSetbackM=1.83,
        sideSetbackFt=6.0,
        sideSetbackM=1.83,
        outerBoundarySetbackFt=10.0,
        outerBoundarySetbackM=3.05,
        openSpacePercentage=10.0,
        amenitySpacePercentage=5.0,
        utilitySpacePercentage=1.0,
        maxGroundCoveragePercent=60.0
    )
}


class DynamicPlanningNormsEvaluation(BaseModel):
    """Complete dynamically computed norms result for a specific land parcel and jurisdiction."""
    jurisdictionId: str
    authorityName: str
    applicableRegulation: str
    isCongestedArea: bool
    landUse: str
    landAreaSqm: float
    landAreaSqft: float
    landAreaHectares: float
    isJurisdictionKnown: bool = True
    jurisdictionNotice: Optional[str] = None

    # Space Allocation Breakdown (Mandatory 13D sequence)
    openSpacePercentage: float
    openSpaceRequiredSqm: float
    openSpaceRequiredSqft: float
    minSingleOpenSpaceSqm: float
    minOpenSpaceWidthM: float

    amenitySpacePercentage: float
    amenitySpaceRequiredSqm: float
    amenitySpaceRequiredSqft: float

    utilitySpacePercentage: float
    utilitySpaceRequiredSqm: float
    utilitySpaceRequiredSqft: float

    outerBoundarySetbackM: float
    outerBoundarySetbackFt: float

    internalRoadWidthM: float
    internalRoadWidthFt: float
    mainRoadWidthM: float
    mainRoadWidthFt: float

    minPlotAreaSqm: float
    minPlotAreaSqft: float
    minFrontageM: float
    minFrontageFt: float
    minPlotDepthM: float
    minPlotDepthFt: float

    regulatoryNotes: List[str] = []


class PlanningNormsEngine:
    """Master Planning Norms & Government Regulations Engine."""

    @staticmethod
    def list_maharashtra_authorities() -> List[Dict[str, Any]]:
        """Returns all configured Maharashtra planning authorities for UI selection (13C)."""
        return [auth.model_dump() for auth in MAHARASHTRA_AUTHORITIES.values()]

    @staticmethod
    def list_presets() -> List[Dict[str, Any]]:
        return [p.model_dump() for p in PRESETS.values()]

    @staticmethod
    def get_preset(preset_id: str) -> PlanningNormsPreset:
        if preset_id in PRESETS:
            return PRESETS[preset_id]
        if preset_id in MAHARASHTRA_AUTHORITIES:
            # Generate a preset on the fly for the selected authority
            auth = MAHARASHTRA_AUTHORITIES[preset_id]
            return PlanningNormsPreset(
                id=auth.id,
                name=auth.name,
                authority=auth.name,
                authorityCitation=auth.applicableRegulation,
                minPlotAreaSqft=1076.4,
                minPlotAreaSqm=100.0,
                minFrontageFt=19.68,
                minFrontageM=6.0,
                minPlotDepthFt=39.37,
                minPlotDepthM=12.0,
                internalRoadWidthFt=29.53,
                internalRoadWidthM=9.0,
                mainRoadWidthFt=39.37,
                mainRoadWidthM=12.0,
                accessRoadWidthFt=29.53,
                accessRoadWidthM=9.0,
                frontSetbackFt=9.84,
                frontSetbackM=3.0,
                rearSetbackFt=6.56,
                rearSetbackM=2.0,
                sideSetbackFt=6.56,
                sideSetbackM=2.0,
                outerBoundarySetbackFt=9.84,
                outerBoundarySetbackM=3.0,
                openSpacePercentage=10.0,
                amenitySpacePercentage=5.0,
                utilitySpacePercentage=1.0
            )
        return PRESETS["IN_MH_UDCPR"]

    @classmethod
    def calculate_applicable_norms(
        cls,
        jurisdiction_id: Optional[str] = None,
        land_area_sqm: float = 10000.0,
        land_use: str = "RESIDENTIAL",
        is_congested: bool = False,
    ) -> DynamicPlanningNormsEvaluation:
        """
        Dynamically calculates applicable planning norms under Maharashtra UDCPR 2020.
        Evaluates exact space reservation percentages based on parcel area tiers (Rule 3.4, Rule 3.5).
        """
        is_known = bool(jurisdiction_id and (jurisdiction_id in MAHARASHTRA_AUTHORITIES or jurisdiction_id in PRESETS))
        notice = None if is_known else "Applicable planning authority/jurisdiction required for exact regulatory compliance."

        effective_id = jurisdiction_id if (jurisdiction_id and jurisdiction_id in MAHARASHTRA_AUTHORITIES) else "IN_MH_UDCPR_STANDARD"
        auth = MAHARASHTRA_AUTHORITIES.get(effective_id, MAHARASHTRA_AUTHORITIES["IN_MH_UDCPR_STANDARD"])

        area_sqm = max(100.0, float(land_area_sqm))
        area_sqft = area_sqm * SQM_TO_SQFT
        area_ha = area_sqm / HECTARE_TO_SQM

        notes: List[str] = []

        # ─── 1. RECREATIONAL OPEN SPACE (UDCPR Rule 3.4) ───
        if is_congested:
            open_space_pct = 5.0
            min_single_cluster_sqm = 200.0
            min_open_width_m = 6.0
            notes.append("Congested (Gaothan) area: Relaxed Recreational Open Space (5% or municipal council policy).")
        elif area_ha < 0.40:
            # Under Rule 3.4.1: No open space mandatory for plots < 0.40 Ha (4,000 sqm)
            open_space_pct = 0.0
            min_single_cluster_sqm = 0.0
            min_open_width_m = 0.0
            notes.append("Gross Area < 0.40 Hectare: Mandatory Recreational Open Space not required under UDCPR Rule 3.4.1.")
        elif 0.40 <= area_ha < 1.0:
            open_space_pct = 10.0
            min_single_cluster_sqm = 400.0
            min_open_width_m = 7.5
            notes.append("Gross Area 0.40–1.0 Ha: Mandatory 10% Recreational Open Space (UDCPR Rule 3.4.1, min single area 400 sqm).")
        else:
            open_space_pct = 10.0
            min_single_cluster_sqm = 1000.0
            min_open_width_m = 10.0
            notes.append("Gross Area >= 1.0 Ha: Mandatory 10% Recreational Open Space (UDCPR Rule 3.4.1, min contiguous cluster 1,000 sqm).")

        open_space_sqm = area_sqm * (open_space_pct / 100.0)
        open_space_sqft = open_space_sqm * SQM_TO_SQFT

        # ─── 2. CIVIC AMENITY SPACE (UDCPR Rule 3.5) ───
        amenity_threshold = auth.amenityThresholdHa
        if is_congested:
            amenity_pct = 0.0
            notes.append("Congested core area: Amenity space exempted unless specifically reserved in DP.")
        elif area_ha >= amenity_threshold:
            amenity_pct = 5.0
            notes.append(f"Gross Area >= {amenity_threshold:.1f} Ha: Mandatory 5% Civic Amenity Space under {auth.shortName} regulations.")
        else:
            amenity_pct = 0.0
            notes.append(f"Gross Area < {amenity_threshold:.1f} Ha: Amenity Space exempted under {auth.shortName} norms.")

        amenity_sqm = area_sqm * (amenity_pct / 100.0)
        amenity_sqft = amenity_sqm * SQM_TO_SQFT

        # ─── 3. UTILITY / SERVICE SPACE (UDCPR Ground Infrastructure) ───
        utility_pct = 1.0 if area_ha >= 0.40 else 0.5
        utility_sqm = area_sqm * (utility_pct / 100.0)
        utility_sqft = utility_sqm * SQM_TO_SQFT
        notes.append("Mandatory dedicated utility reservation for MSEDCL electrical substation, solid waste segregation & drainage buffers.")

        # ─── 4. ROAD WIDTHS & HIERARCHIES (UDCPR Rule 3.3) ───
        if is_congested:
            internal_road_m = 6.0
            main_road_m = 9.0
        else:
            internal_road_m = 9.0   # 9.0m minimum in non-congested for length up to 150m
            main_road_m = 12.0     # 12.0m for spine/arterial corridors

        # ─── 5. SETBACKS (UDCPR Rule 6.1 & 6.2) ───
        if is_congested:
            setback_m = 1.5
        else:
            setback_m = 3.0  # 3.0m peripheral boundary setback

        # ─── 6. MINIMUM PLOT DIMENSIONS (UDCPR Rule 3.6 & 3.7) ───
        land_use_norm = land_use.upper()
        if "AFFORDABLE" in land_use_norm or "EWS" in land_use_norm:
            min_plot_sqm = 50.0
            min_frontage_m = 4.5
            min_depth_m = 10.0
        elif "MIXED" in land_use_norm or "COMMERCIAL" in land_use_norm:
            min_plot_sqm = 150.0
            min_frontage_m = 9.0
            min_depth_m = 15.0
        elif is_congested:
            min_plot_sqm = 50.0
            min_frontage_m = 4.5
            min_depth_m = 10.0
        else:
            min_plot_sqm = 100.0  # Standard residential
            min_frontage_m = 6.0
            min_depth_m = 12.0

        return DynamicPlanningNormsEvaluation(
            jurisdictionId=auth.id,
            authorityName=auth.name,
            applicableRegulation=auth.applicableRegulation,
            isCongestedArea=is_congested,
            landUse=land_use,
            landAreaSqm=round(area_sqm, 2),
            landAreaSqft=round(area_sqft, 2),
            landAreaHectares=round(area_ha, 3),
            isJurisdictionKnown=is_known,
            jurisdictionNotice=notice,
            openSpacePercentage=round(open_space_pct, 1),
            openSpaceRequiredSqm=round(open_space_sqm, 2),
            openSpaceRequiredSqft=round(open_space_sqft, 2),
            minSingleOpenSpaceSqm=min_single_cluster_sqm,
            minOpenSpaceWidthM=min_open_width_m,
            amenitySpacePercentage=round(amenity_pct, 1),
            amenitySpaceRequiredSqm=round(amenity_sqm, 2),
            amenitySpaceRequiredSqft=round(amenity_sqft, 2),
            utilitySpacePercentage=round(utility_pct, 1),
            utilitySpaceRequiredSqm=round(utility_sqm, 2),
            utilitySpaceRequiredSqft=round(utility_sqft, 2),
            outerBoundarySetbackM=round(setback_m, 2),
            outerBoundarySetbackFt=round(setback_m * M_TO_FT, 2),
            internalRoadWidthM=round(internal_road_m, 2),
            internalRoadWidthFt=round(internal_road_m * M_TO_FT, 2),
            mainRoadWidthM=round(main_road_m, 2),
            mainRoadWidthFt=round(main_road_m * M_TO_FT, 2),
            minPlotAreaSqm=round(min_plot_sqm, 2),
            minPlotAreaSqft=round(min_plot_sqm * SQM_TO_SQFT, 2),
            minFrontageM=round(min_frontage_m, 2),
            minFrontageFt=round(min_frontage_m * M_TO_FT, 2),
            minPlotDepthM=round(min_depth_m, 2),
            minPlotDepthFt=round(min_depth_m * M_TO_FT, 2),
            regulatoryNotes=notes
        )


planning_norms_engine_instance = PlanningNormsEngine()
