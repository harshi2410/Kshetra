import logging
import re
from typing import Dict, Any, List
from app.services.benchmark.schemas import OCRMetrics

logger = logging.getLogger(__name__)

def levenshtein_distance(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    
    return previous_row[-1]

def normalize_text(text: str) -> str:
    if not text: return ""
    return re.sub(r'[^a-z0-9]', '', str(text).lower())

class OCRMetricsEvaluator:
    def evaluate(self, gt_labels: List[Dict[str, Any]], pred_labels: List[Dict[str, Any]]) -> OCRMetrics:
        if not gt_labels and not pred_labels:
            return OCRMetrics(
                precision=1.0, recall=1.0, f1_score=1.0,
                exact_match_ratio=1.0, normalized_match_ratio=1.0,
                mean_levenshtein_distance=0.0, wer=0.0
            )

        gt_texts = [l.get("rawText", "") for l in gt_labels]
        pred_texts = [l.get("rawText", "") for l in pred_labels]
        
        gt_norm = [normalize_text(t) for t in gt_texts]
        pred_norm = [normalize_text(t) for t in pred_texts]
        
        exact_matches = 0
        norm_matches = 0
        lev_dists = []
        
        pred_matched = set()
        
        for gt, gtn in zip(gt_texts, gt_norm):
            best_match_idx = -1
            best_lev = float('inf')
            
            for j, (pr, prn) in enumerate(zip(pred_texts, pred_norm)):
                if j in pred_matched:
                    continue
                
                if gt == pr:
                    exact_matches += 1
                    norm_matches += 1
                    best_match_idx = j
                    best_lev = 0
                    break
                    
                if gtn == prn:
                    norm_matches += 1
                    best_match_idx = j
                    best_lev = 0
                    break
                    
                lev = levenshtein_distance(gtn, prn)
                if lev < best_lev:
                    best_lev = lev
                    best_match_idx = j
                    
            if best_match_idx != -1:
                pred_matched.add(best_match_idx)
                lev_dists.append(best_lev)
            else:
                lev_dists.append(len(gtn)) # Max error

        tp = norm_matches
        fp = len(pred_texts) - tp
        fn = len(gt_texts) - tp
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        
        exact_ratio = exact_matches / len(gt_texts) if gt_texts else 0.0
        norm_ratio = norm_matches / len(gt_texts) if gt_texts else 0.0
        
        mean_lev = sum(lev_dists) / len(lev_dists) if lev_dists else 0.0
        
        # Approximate WER by Levenshtein distance on characters
        wer = mean_lev / (sum(len(t) for t in gt_norm) / len(gt_norm)) if gt_norm and sum(len(t) for t in gt_norm) > 0 else 0.0

        return OCRMetrics(
            precision=round(precision, 4),
            recall=round(recall, 4),
            f1_score=round(f1, 4),
            exact_match_ratio=round(exact_ratio, 4),
            normalized_match_ratio=round(norm_ratio, 4),
            mean_levenshtein_distance=round(mean_lev, 2),
            wer=round(wer, 4)
        )

ocr_metrics_evaluator_instance = OCRMetricsEvaluator()
