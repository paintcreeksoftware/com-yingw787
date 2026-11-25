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

For a plan-only identity, attach [the site plan IAM policy](site/plan-policy.json)
after filling in the bucket names, AWS account ID, hosted zone ID and any
existing generated resource IDs (use the suffix of the certificate ARN for
its ID). If a resource does not exist yet, use `*` just for its generated ID
and narrow the ARN once it has been provisioned. The policy requires a
dedicated state bucket: it lists that bucket, reads only the site state object,
and can write or delete only the corresponding lockfile. It cannot apply a
plan, modify DNS or publish the site. AWS STS `GetCallerIdentity` is called
but requires no grant. The policy is for the site root; provisioning the
state bucket is a separate operator step. Prefer short-lived credentials.

## Preview

After approval, apply a reviewed site plan and use the manual publish workflow
below. Verify the CloudFront hostname from `terraform output`: HTTPS, the home
page, the real 404 page with a 404 status, assets, and headers. This config does
not change the existing Firebase deployment.

## Manual publish

If the account already has the IAM provider for `token.actions.githubusercontent.com`
with `sts.amazonaws.com` as an audience, set `github_oidc_provider_arn` to reuse it.
Otherwise Terraform creates the provider. The publish role trusts only this
repository's `main` branch and needs no GitHub AWS access-key secret.

After approval to publish to the AWS preview, set the GitHub repository
variables below using the site root's Terraform outputs:

| Variable                      | Site output        |
| ----------------------------- | ------------------ |
| `AWS_HOSTING_ROLE_ARN`        | `publish_role_arn` |
| `AWS_HOSTING_REGION`          | `site_region`      |
| `AWS_HOSTING_BUCKET`          | `site_bucket_name` |
| `AWS_HOSTING_DISTRIBUTION_ID` | `distribution_id`  |

Then explicitly set `AWS_HOSTING_ENABLED` to `true` and run **Publish to AWS**
manually from `main`. Pushes never trigger it. Publishing copies the current
Next.js export, removes obsolete mutable keys, and invalidates CloudFront.
Previously published fingerprinted assets are retained for cached clients;
they can be pruned by an operator once those caches have expired.

## Custom domain and DNS cutover

The domain already uses a public Route 53 zone with a Firebase apex A record
(`199.36.158.100`, TTL 60) and unrelated records, including mail. Do not create a
replacement zone or change registrar delegation. Verify that the existing
zone's nameservers match `dig NS yingw787.com +short`. Leave `enable_www = false`
unless approved: `www.yingw787.com` is currently NXDOMAIN.

1. After approval to provision, set `route53_zone_id` to the existing public zone
   ID and `enable_custom_domain = true` in your local site variables. Keep
   `dns_target = "unmanaged"`. Review and apply a saved site plan. This creates
   ACM validation CNAMEs, issues a certificate in `us-east-1`, and attaches it
   and the apex domain to CloudFront without touching traffic records. If an
   ACM CNAME already exists, import it rather than overwriting it.
2. Publish the export and verify the CloudFront hostname. Test the custom
   domain before changing DNS by replacing the placeholder in
   `curl --connect-to yingw787.com:443:CLOUDFRONT_HOST:443 https://yingw787.com/`.
3. **Only after Ying approves the cutover**, set `dns_target = "cloudfront"` in
   your site variables and import the existing apex A record. This records its
   current value in Terraform state without changing DNS:

   ```sh
   terraform -chdir=infra/aws/site import 'aws_route53_record.apex_ipv4[0]' 'YOUR_ZONE_ID_yingw787.com_A'
   ```

   Use the same site variables for import, plan and apply. The cutover plan
   should update the apex A record in place and add an apex AAAA alias; if
   opted in, it also adds www A and AAAA aliases. Review and apply the saved
   plan, then verify authoritative DNS, HTTPS and the site. Keep Firebase
   hosting available during the rollback window.

4. To roll back, keep the custom domain enabled and set
   `dns_target = "firebase"`, then review and apply the rollback plan. Verify
   that Firebase still serves `199.36.158.100` for the apex before applying.
   Do not revert to `unmanaged` while the apex is in Terraform state.

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
