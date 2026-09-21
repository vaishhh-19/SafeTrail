"""
SafeTrail — Cloud Model Sync
============================
After every retrain, pushes the freshly-trained model files up to
S3-compatible cloud storage so there's always an off-machine backup
and other environments (e.g. a deployed backend) can pull the latest
model without retraining locally.

Works with real AWS S3, and any S3-compatible provider (Cloudflare R2,
Backblaze B2, MinIO, DigitalOcean Spaces, GCS via its S3 interop mode)
by pointing CLOUD_STORAGE_ENDPOINT_URL at that provider.

Configuration (all via environment variables / .env):
    CLOUD_STORAGE_BUCKET        required — turns cloud sync on
    CLOUD_STORAGE_PREFIX        optional — key prefix, default "safetrail/models"
    CLOUD_STORAGE_REGION        optional — default "us-east-1"
    CLOUD_STORAGE_ENDPOINT_URL  optional — set for non-AWS S3-compatible providers
    AWS_ACCESS_KEY_ID           required for upload
    AWS_SECRET_ACCESS_KEY       required for upload

If CLOUD_STORAGE_BUCKET isn't set, this module no-ops so the retrain
pipeline keeps working purely locally (no cloud account needed for
local dev / the demo).
"""
import os
from datetime import datetime

MODEL_FILENAMES = [
    "random_forest.pkl",
    "isolation_forest.pkl",
    "scaler.pkl",
    "label_encoder.pkl",
    "feature_cols.pkl",
]


def cloud_sync_enabled():
    return bool(os.getenv("CLOUD_STORAGE_BUCKET"))


def upload_models_to_cloud(models_dir):
    """Upload the current model files to cloud storage.

    Returns a small report dict; never raises — a failed/unconfigured
    cloud upload should never break local retraining.
    """
    if not cloud_sync_enabled():
        return {
            "enabled": False,
            "message": "CLOUD_STORAGE_BUCKET not set — skipped cloud upload, "
                       "models saved locally only.",
        }

    bucket   = os.getenv("CLOUD_STORAGE_BUCKET")
    prefix   = os.getenv("CLOUD_STORAGE_PREFIX", "safetrail/models").strip("/")
    region   = os.getenv("CLOUD_STORAGE_REGION", "us-east-1")
    endpoint = os.getenv("CLOUD_STORAGE_ENDPOINT_URL") or None

    try:
        import boto3
        from botocore.exceptions import BotoCoreError, ClientError
    except ImportError:
        return {
            "enabled": True,
            "success": False,
            "message": "boto3 not installed — run `pip install boto3` to enable cloud sync.",
        }

    try:
        client = boto3.client(
            "s3",
            region_name=region,
            endpoint_url=endpoint,
        )

        uploaded = []
        version_tag = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

        for fname in MODEL_FILENAMES:
            fpath = os.path.join(models_dir, fname)
            if not os.path.exists(fpath):
                continue

            # "latest" key — always points at the current model, so a
            # deployed backend can always fetch the newest version.
            latest_key = f"{prefix}/latest/{fname}"
            client.upload_file(fpath, bucket, latest_key)

            # Versioned copy too, so past model states are recoverable
            # from cloud storage (mirrors the local backups/ folder).
            versioned_key = f"{prefix}/versions/{version_tag}/{fname}"
            client.upload_file(fpath, bucket, versioned_key)

            uploaded.append(fname)

        return {
            "enabled": True,
            "success": True,
            "bucket": bucket,
            "prefix": prefix,
            "version": version_tag,
            "files_uploaded": uploaded,
            "message": f"Uploaded {len(uploaded)} model files to s3://{bucket}/{prefix}",
        }

    except (BotoCoreError, ClientError) as e:
        return {
            "enabled": True,
            "success": False,
            "message": f"Cloud upload failed: {e}",
        }
    except Exception as e:
        return {
            "enabled": True,
            "success": False,
            "message": f"Cloud upload failed (unexpected error): {e}",
        }
