import os
from deploy_backend_eb import main

# Compatibility aliases for GitHub Actions workflow env names.
if os.getenv("AWS_EB_BUNDLE") and not os.getenv("BACKEND_BUNDLE_PATH"):
    os.environ["BACKEND_BUNDLE_PATH"] = os.getenv("AWS_EB_BUNDLE")

if os.getenv("AWS_EB_S3_BUCKET") and not os.getenv("AWS_S3_DEPLOY_BUCKET"):
    os.environ["AWS_S3_DEPLOY_BUCKET"] = os.getenv("AWS_EB_S3_BUCKET")

if os.getenv("AWS_EB_VERSION_LABEL") and not os.getenv("BACKEND_VERSION_LABEL"):
    os.environ["BACKEND_VERSION_LABEL"] = os.getenv("AWS_EB_VERSION_LABEL")

if __name__ == "__main__":
    main()
