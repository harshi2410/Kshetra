# BENCHMARK REPORT: test-benchmark-001

## 1. Meta Information
- **Ground Truth Version**: v1
- **Pipeline Version**: 1.0
- **Git Commit**: HEAD
- **Processing Time**: 42.38 ms
- **Peak Memory**: 16.97 KB
- **Overall Result**: PASS

## 2. Failure Categories
- None

## 3. Core Questions Answered
**1. How many plots were detected correctly?**
- 2 out of 2 ground truth plots were matched (IoU >= 0.5).

**2. Which plots were wrong?**
- Mean IoU for matched plots: 1.0
- Median IoU for matched plots: 1.0

**3. Which plots were missing?**
- Missing plots count: 0

**4. Which plots were merged?**
- Merged plots count: 0

**5. How accurate are polygon shapes?**
- Boundary IoU: 1.0
- Plot Centroid Error (mean): 0.0

**6. How accurate are areas?**
- Plot Area Relative Error (mean %): 0.0
- Boundary Area Relative Error (%): 0.0

**7. How accurate are roads?**
- Road Topology Overlap IoU: 1.0
- Road Length Error (%): 0.0

**8. How accurate is OCR?**
- Recall: 1.0
- Precision: 1.0
- F1 Score: 1.0
- Mean Levenshtein Distance: 0.0
- Word Error Rate: 0.0

**9. Which pipeline stage is responsible for failures?**
```json
{
  "boundary_evaluation": {
    "pass": true,
    "measured_iou": 1.0,
    "threshold": 0.9
  },
  "plot_evaluation": {
    "pass": true,
    "measured_mean_iou": 1.0,
    "threshold": 0.85
  },
  "ocr_evaluation": {
    "pass": true,
    "measured_recall": 1.0,
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
- YES

