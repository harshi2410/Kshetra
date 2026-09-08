# BENCHMARK REPORT: test-benchmark-001

## 1. Meta Information
- **Ground Truth Version**: v1
- **Pipeline Version**: 1.0
- **Git Commit**: HEAD
- **Processing Time**: 29.23 ms
- **Peak Memory**: 16.97 KB
- **Overall Result**: FAIL

## 2. Failure Categories
- MERGED_PLOTS
- MISSING_PLOTS
- OCR_FAILURE
- ROAD_FAILURE

## 3. Core Questions Answered
**1. How many plots were detected correctly?**
- 1 out of 2 ground truth plots were matched (IoU >= 0.5).

**2. Which plots were wrong?**
- Mean IoU for matched plots: 0.875
- Median IoU for matched plots: 0.875

**3. Which plots were missing?**
- Missing plots count: 1

**4. Which plots were merged?**
- Merged plots count: 1

**5. How accurate are polygon shapes?**
- Boundary IoU: 0.9
- Plot Centroid Error (mean): 2.5

**6. How accurate are areas?**
- Plot Area Relative Error (mean %): 12.5
- Boundary Area Relative Error (%): 10.0

**7. How accurate are roads?**
- Road Topology Overlap IoU: 0.0
- Road Length Error (%): 100.0

**8. How accurate is OCR?**
- Recall: 0.0
- Precision: 0.0
- F1 Score: 0.0
- Mean Levenshtein Distance: 4.0
- Word Error Rate: 0.5714

**9. Which pipeline stage is responsible for failures?**
```json
{
  "boundary_evaluation": {
    "pass": true,
    "measured_iou": 0.9,
    "threshold": 0.9
  },
  "plot_evaluation": {
    "pass": true,
    "measured_mean_iou": 0.875,
    "threshold": 0.85
  },
  "ocr_evaluation": {
    "pass": false,
    "measured_recall": 0.0,
    "threshold": 0.8
  },
  "label_association_evaluation": {
    "pass": true,
    "measured_accuracy": 1.0,
    "threshold": 0.85
  }
}
```

**10. Is this layout production-acceptable?**
- NO, failed on configured thresholds.

