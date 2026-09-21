# SafeTrail Road Intelligence

This version adds a road-level learning layer to the existing global risk model.

## What changed

- A stable GPS **road-segment proxy** is created from `area_name + ~200m GPS grid` because the bundled dataset does not contain official road IDs/geometries.
- A single Random Forest remains the global classifier. We do **not** train one model per road, which would overfit sparse roads.
- Road profiles are learned from the training split only and saved to `ml/models/road_profiles.json`.
- Inference blends the global class probabilities with the road's smoothed historical danger prior. Sparse/new segments receive little road-specific influence; well-observed segments receive up to 30% calibration influence.
- Training saves `ml/models/training_metrics.json` with precision, recall, F1 and accuracy for the global and road-calibrated predictions.
- Admin now has a **Danger Roads** section showing trained road-segment risk, sample counts, night incidents and model precision.
- API endpoint: `GET /api/admin/road-intelligence` (admin JWT required).

## Train again

From the `ml` folder:

```powershell
python train.py
```

This regenerates the Random Forest, Isolation Forest, DBSCAN clusters, road profiles and evaluation metrics.

## Important data-quality note

The bundled `bangalore_crime.csv` is synthetic and has no real incident date or canonical road geometry. Its very high holdout score is therefore **not a production accuracy claim**. For real precision improvement, add verified incidents with a timestamp, road/road-segment ID, incident severity/type and source/verification status. Then use a chronological train/test split and evaluate precision, recall and F1 on future data.

## Production upgrade

Replace the GPS grid proxy with a real road-network identifier (for example from your chosen map/road-data provider). Keep the same global-model + road-prior architecture and fall back to the global model for roads with insufficient data.
