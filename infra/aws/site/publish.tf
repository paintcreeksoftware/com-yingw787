variable "github_oidc_provider_arn" {
  type        = string
  description = "Optional ARN of the account's existing GitHub Actions OIDC provider. Leave unset to create it."
  default     = null

  validation {
    condition     = var.github_oidc_provider_arn == null || can(regex("^arn:aws:iam::[0-9]{12}:oidc-provider/token[.]actions[.]githubusercontent[.]com$", var.github_oidc_provider_arn))
    error_message = "Use the IAM ARN for token.actions.githubusercontent.com."
  }
}

locals {
  github_oidc_host = "token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  count          = var.github_oidc_provider_arn == null ? 1 : 0
  url            = "https://${local.github_oidc_host}"
  client_id_list = ["sts.amazonaws.com"]
}

resource "aws_iam_role" "publish" {
  name = "yingw787-github-publish"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = coalesce(var.github_oidc_provider_arn, one(aws_iam_openid_connect_provider.github[*].arn)) }
      Condition = {
        StringEquals = {
          "${local.github_oidc_host}:aud" = "sts.amazonaws.com"
          "${local.github_oidc_host}:sub" = "repo:paintcreeksoftware/com-yingw787:ref:refs/heads/main"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "publish" {
  name = "publish-static-export"
  role = aws_iam_role.publish.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "s3:ListBucket"
      Resource = aws_s3_bucket.site.arn
      }, {
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:DeleteObject", "s3:AbortMultipartUpload"]
      Resource = "${aws_s3_bucket.site.arn}/*"
      }, {
      Effect   = "Allow"
      Action   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
      Resource = aws_cloudfront_distribution.site.arn
    }]
  })
}

output "publish_role_arn" {
  description = "OIDC role ARN for the manual GitHub Actions publishing workflow."
  value       = aws_iam_role.publish.arn
}

output "site_region" {
  description = "AWS region for the GitHub Actions publishing workflow."
  value       = var.aws_region
}
