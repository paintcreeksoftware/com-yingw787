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
