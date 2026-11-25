# AWS static hosting

Firebase remains production. Nothing in this directory is applied by CI.
Use Terraform 1.12.2 and an approved AWS operator identity for infrastructure
writes. The AWS provider is pinned and its checksums are checked in.

## Bootstrap and plan

A one-time operator creates the private, versioned S3 state bucket:

```sh
terraform -chdir=infra/aws/bootstrap init
terraform -chdir=infra/aws/bootstrap plan -var='state_bucket_name=YOUR_STATE_BUCKET'
# Only after approval:
terraform -chdir=infra/aws/bootstrap apply -var='state_bucket_name=YOUR_STATE_BUCKET'
```

Keep the bootstrap root's local state in secure storage. Do not commit it. If
using a region other than `us-east-1`, set `aws_region` for the bootstrap and
use the same region for backend initialization.

```sh
terraform -chdir=infra/aws/site init -backend-config='bucket=YOUR_STATE_BUCKET' -backend-config='region=us-east-1'
terraform -chdir=infra/aws/site plan -var='site_bucket_name=YOUR_SITE_BUCKET'
```

The site state key is `yingw787.com/site.tfstate` in the default Terraform
workspace. The backend uses native S3 lockfiles. Do not commit state or plans.

## Preview

After approval, apply a reviewed plan and publish the Next static export
to the private site bucket with Firebase's cache-control metadata. Verify
the CloudFront hostname from `terraform output`: HTTPS, the home page, the
real 404 page with a 404 status, assets, and headers. This config does not change
the existing Firebase deployment.

## Local checks

```sh
terraform fmt -check -recursive infra/aws
for root in bootstrap site; do
  terraform -chdir="infra/aws/$root" init -backend=false -lockfile=readonly
  terraform -chdir="infra/aws/$root" validate
  tflint --chdir="infra/aws/$root"
  terraform -chdir="infra/aws/$root" test
done
npm run build
node --test infra/aws/site/tests/*.test.mjs
```
