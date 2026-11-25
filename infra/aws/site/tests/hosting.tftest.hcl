mock_provider "aws" {}

mock_provider "aws" {
  alias = "virginia"
}

run "private_static_hosting" {
  command = plan

  variables {
    site_bucket_name = "example-yingw787-site"
  }

  assert {
    condition = (
      aws_s3_bucket_public_access_block.site.block_public_acls &&
      aws_s3_bucket_public_access_block.site.block_public_policy &&
      aws_s3_bucket_public_access_block.site.ignore_public_acls &&
      aws_s3_bucket_public_access_block.site.restrict_public_buckets &&
      aws_cloudfront_origin_access_control.site.signing_behavior == "always"
    )
    error_message = "The site bucket must be private and CloudFront must sign origin requests."
  }

  assert {
    condition = (
      aws_cloudfront_distribution.site.default_cache_behavior[0].viewer_protocol_policy == "redirect-to-https" &&
      aws_cloudfront_distribution.site.viewer_certificate[0].cloudfront_default_certificate &&
      length(aws_cloudfront_distribution.site.custom_error_response) == 2 &&
      alltrue([
        for error in aws_cloudfront_distribution.site.custom_error_response :
        (error.error_code == 403 || error.error_code == 404) &&
        error.response_code == 404 && error.response_page_path == "/404.html"
      ])
    )
    error_message = "The preview distribution must redirect to HTTPS and serve the exported 404."
  }
}
