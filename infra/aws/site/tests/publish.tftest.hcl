mock_provider "aws" {
  override_during = plan
}

mock_provider "aws" {
  alias = "virginia"
}

run "publish_role_trust_and_permissions" {
  command = plan

  override_resource {
    target          = aws_s3_bucket.site
    override_during = plan
    values          = { arn = "arn:aws:s3:::example-yingw787-site" }
  }

  override_resource {
    target          = aws_cloudfront_distribution.site
    override_during = plan
    values          = { arn = "arn:aws:cloudfront::123456789012:distribution/EXAMPLE" }
  }

  variables {
    site_bucket_name         = "example-yingw787-site"
    github_oidc_provider_arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
  }

  assert {
    condition = (
      length(aws_iam_openid_connect_provider.github) == 0 &&
      jsondecode(aws_iam_role.publish.assume_role_policy).Statement[0].Principal.Federated == var.github_oidc_provider_arn &&
      jsondecode(aws_iam_role.publish.assume_role_policy).Statement[0].Condition.StringEquals == {
        "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        "token.actions.githubusercontent.com:sub" = "repo:paintcreeksoftware/com-yingw787:ref:refs/heads/main"
      }
    )
    error_message = "Only main in the site repository may assume the publishing role, using the GitHub OIDC audience."
  }

  assert {
    condition = {
      for statement in jsondecode(aws_iam_role_policy.publish.policy).Statement :
      statement.Resource => toset(flatten([statement.Action]))
      } == {
      "arn:aws:s3:::example-yingw787-site"                    = toset(["s3:ListBucket"])
      "arn:aws:s3:::example-yingw787-site/*"                  = toset(["s3:PutObject", "s3:DeleteObject", "s3:AbortMultipartUpload"])
      "arn:aws:cloudfront::123456789012:distribution/EXAMPLE" = toset(["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"])
    }
    error_message = "The publishing role must only grant access to the site's bucket and distribution."
  }
}

run "new_oidc_provider" {
  command = plan

  variables {
    site_bucket_name = "example-yingw787-site"
  }

  assert {
    condition = (
      aws_iam_openid_connect_provider.github[0].url == "https://token.actions.githubusercontent.com" &&
      aws_iam_openid_connect_provider.github[0].client_id_list == toset(["sts.amazonaws.com"])
    )
    error_message = "New AWS accounts must configure the expected GitHub OIDC provider."
  }
}
