# Deployment Guide

This guide explains the CI/CD pipeline and deployment process for the Task Management API using Git-Flow methodology and Google Cloud Platform App Engine.

## Table of Contents

- [Git-Flow Workflow](#git-flow-workflow)
- [Branch Strategy](#branch-strategy)
- [CI/CD Pipeline](#cicd-pipeline)
- [GCP Setup](#gcp-setup)
- [GitHub Secrets Configuration](#github-secrets-configuration)
- [Deployment Process](#deployment-process)

## Git-Flow Workflow

This project follows the Git-Flow branching model with three main branches:

### Branch Strategy

1. **main** - Production-ready code (not deployed automatically)
2. **release** - Production deployment branch
3. **develop** - Development and testing branch (staging deployment)

### Feature Development Workflow

```bash
# Start a new feature
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Work on your feature
git add .
git commit -m "Add feature description"

# Push feature branch
git push origin feature/your-feature-name

# Create Pull Request to develop branch
# After review and approval, merge to develop
```

### Release Workflow

```bash
# When ready to release to production
git checkout release
git pull origin release
git merge develop

# Push to release branch
git push origin release

# Optionally create a tag for versioning
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## CI/CD Pipeline

### Automated Deployments

The CI/CD pipeline automatically deploys to different environments based on branch activity:

#### Staging Deployment (develop branch)

**Trigger:** Push to `develop` branch

**Workflow:** `.github/workflows/staging.yml`

**Steps:**
1. Run automated tests
2. Deploy to GCP App Engine staging service
3. Staging URL: `https://staging-dot-PROJECT_ID.appspot.com`

```bash
# Deploy to staging
git checkout develop
git add .
git commit -m "Your changes"
git push origin develop
# Automatic deployment triggered
```

#### Production Deployment (release branch)

**Trigger:** Push to `release` branch

**Workflow:** `.github/workflows/production.yml`

**Steps:**
1. Run automated tests
2. Deploy to GCP App Engine production service
3. Production URL: `https://PROJECT_ID.appspot.com`

```bash
# Deploy to production
git checkout release
git merge develop
git push origin release
# Automatic deployment triggered
```

#### Tagged Release Deployment

**Trigger:** Push tags matching `v*` pattern

**Workflow:** `.github/workflows/release-tag.yml`

**Steps:**
1. Run automated tests
2. Deploy to GCP App Engine production
3. Create GitHub Release with deployment notes

```bash
# Create and deploy a tagged release
git checkout release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
# Automatic deployment and GitHub release created
```

## GCP Setup

### Prerequisites

1. **Create a GCP Project**
   ```bash
   gcloud projects create YOUR_PROJECT_ID
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable App Engine**
   ```bash
   gcloud app create --region=us-central
   ```

3. **Enable Required APIs**
   ```bash
   gcloud services enable appengine.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

4. **Create a Service Account for GitHub Actions**
   ```bash
   gcloud iam service-accounts create github-actions \
       --display-name="GitHub Actions Deployment"

   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
       --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
       --role="roles/appengine.appAdmin"

   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
       --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
       --role="roles/storage.admin"

   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
       --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
       --role="roles/cloudbuild.builds.editor"
   ```

5. **Create and Download Service Account Key**
   ```bash
   gcloud iam service-accounts keys create github-actions-key.json \
       --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

### Database Setup (Cloud SQL - PostgreSQL)

1. **Create Cloud SQL Instance**
   ```bash
   gcloud sql instances create taskdb-instance \
       --database-version=POSTGRES_15 \
       --tier=db-f1-micro \
       --region=us-central1
   ```

2. **Create Database**
   ```bash
   gcloud sql databases create taskdb \
       --instance=taskdb-instance
   ```

3. **Create Database User**
   ```bash
   gcloud sql users create apiuser \
       --instance=taskdb-instance \
       --password=YOUR_SECURE_PASSWORD
   ```

4. **Update app.yaml files with Cloud SQL connection string**
   ```
   DATABASE_URL: "postgresql://apiuser:PASSWORD@/taskdb?host=/cloudsql/PROJECT_ID:us-central1:taskdb-instance"
   ```

## GitHub Secrets Configuration

Configure the following secrets in your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

### Required Secrets

1. **GCP_PROJECT_ID**
   - Value: Your GCP Project ID
   - Example: `my-task-app-12345`

2. **GCP_SA_KEY**
   - Value: Contents of `github-actions-key.json`
   - Copy the entire JSON file contents

3. **OPENAI_API_KEY**
   - Value: Your OpenAI API key
   - Get from: https://platform.openai.com/api-keys

4. **PINECONE_API_KEY**
   - Value: Your Pinecone API key
   - Get from: https://app.pinecone.io/

5. **DATABASE_URL** (Optional - for additional security)
   - Value: Your Cloud SQL connection string

### Setting Secrets via GitHub CLI

```bash
gh secret set GCP_PROJECT_ID --body "your-project-id"
gh secret set GCP_SA_KEY < github-actions-key.json
gh secret set OPENAI_API_KEY --body "sk-..."
gh secret set PINECONE_API_KEY --body "pcsk_..."
```

## Deployment Process

### Initial Deployment

1. **Set up GCP Project** (see GCP Setup above)

2. **Configure GitHub Secrets** (see GitHub Secrets Configuration above)

3. **Update Configuration Files**

   Edit `backend/app.staging.yaml` and `backend/app.production.yaml`:
   - Update DATABASE_URL with your Cloud SQL connection string
   - Update BACKEND_CORS_ORIGINS with your frontend URLs
   - Update Pinecone settings if needed

4. **Push to Staging**
   ```bash
   git checkout develop
   git add .
   git commit -m "Configure GCP deployment"
   git push origin develop
   ```

   Monitor deployment in GitHub Actions tab.

5. **Test Staging Environment**

   Visit: `https://staging-dot-YOUR_PROJECT_ID.appspot.com/docs`

6. **Deploy to Production**
   ```bash
   git checkout release
   git merge develop
   git push origin release
   ```

### Subsequent Deployments

For feature updates:

```bash
# 1. Develop feature on feature branch
git checkout develop
git checkout -b feature/new-feature
# Make changes
git push origin feature/new-feature

# 2. Create PR to develop → merges automatically deploy to staging

# 3. Test on staging environment

# 4. Merge to release for production deployment
git checkout release
git merge develop
git push origin release
```

### Rollback Procedure

If you need to rollback a deployment:

```bash
# List recent versions
gcloud app versions list --service=default

# Route traffic to previous version
gcloud app services set-traffic default \
    --splits=PREVIOUS_VERSION=1 \
    --split-by=random
```

## Monitoring and Logs

### View Application Logs

```bash
# Staging logs
gcloud app logs tail --service=staging

# Production logs
gcloud app logs tail --service=default
```

### View in GCP Console

Visit: https://console.cloud.google.com/appengine

## Environment Configuration

### Local Development

Use `backend/.env.example` as template:

```bash
cd backend
cp .env.example .env
# Edit .env with your local configuration
```

### Staging Environment

Environment variables are set in `backend/app.staging.yaml`

### Production Environment

Environment variables are set in `backend/app.production.yaml`

## Testing

### Run Tests Locally

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

### CI/CD Tests

Tests run automatically on every push to `develop` or `release` branches.

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs for error messages
2. Verify all secrets are correctly configured
3. Ensure GCP service account has proper permissions
4. Check `gcloud app logs tail` for runtime errors

### Database Connection Issues

1. Verify Cloud SQL instance is running
2. Check DATABASE_URL format in app.yaml
3. Ensure service account has Cloud SQL Client role

### API Keys Not Working

1. Verify secrets are set in GitHub repository settings
2. Check that secret names match workflow files
3. Ensure API keys are valid and have proper permissions

## Additional Resources

- [GCP App Engine Documentation](https://cloud.google.com/appengine/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Git-Flow Cheatsheet](https://danielkummer.github.io/git-flow-cheatsheet/)
