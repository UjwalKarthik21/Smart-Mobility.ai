Deployment instructions for Google Cloud Run

Prerequisites:
- Install and authenticate gcloud: `gcloud auth login` and `gcloud auth configure-docker`
- Set project: `gcloud config set project peerless-sensor-493403-m2`

Build & push with Cloud Build (recommended):

```bash
# Submit Cloud Build (uses cloudbuild.yaml)
gcloud builds submit --substitutions=_REGION=us-central1
```

Manual build & deploy:

```bash
# Build image locally and push to GCR
IMAGE=gcr.io/peerless-sensor-493403-m2/smart-mobility:latest
docker build -t $IMAGE .
docker push $IMAGE

# Deploy to Cloud Run
gcloud run deploy smart-mobility \
  --image $IMAGE \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

Notes:
- Cloud Run will use the `PORT` environment variable; the Dockerfile starts Next on `$PORT`.
- If you prefer Artifact Registry, update the image URL accordingly.
- For continuous deploy from GitHub, connect the repo to Cloud Build triggers in Google Cloud Console.
