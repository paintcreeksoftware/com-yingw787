locals {
  domain = "yingw787.com"
  firebase_security_headers = {
    for header in one([
      for rule in jsondecode(file("${path.module}/../../../firebase.json")).hosting.headers : rule.headers
      if try(rule.source, null) == "**"
    ]) : header.key => header.value
  }
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = local.domain
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "directory_index" {
  name    = "yingw787-directory-index"
  runtime = "cloudfront-js-2.0"
  code    = file("${path.module}/directory-index.js.tftpl")
  publish = true
}

resource "aws_cloudfront_cache_policy" "site" {
  name        = "yingw787-static-export"
  default_ttl = 3600
  min_ttl     = 0
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_response_headers_policy" "site" {
  name = "yingw787-security-headers"

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = local.firebase_security_headers["X-Frame-Options"]
      override     = true
    }

    referrer_policy {
      referrer_policy = local.firebase_security_headers["Referrer-Policy"]
      override        = true
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = local.firebase_security_headers["Permissions-Policy"]
      override = true
    }
  }
}

resource "aws_cloudfront_distribution" "site" {
  comment         = local.domain
  aliases         = sort(tolist(local.custom_domains))
  enabled         = true
  is_ipv6_enabled = true
  http_version    = "http2and3"

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "site"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id           = "site"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.site.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.site.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.directory_index.arn
    }
  }

  dynamic "custom_error_response" {
    for_each = toset([403, 404])
    content {
      error_code            = custom_error_response.value
      response_code         = 404
      response_page_path    = "/404.html"
      error_caching_min_ttl = 0
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = !var.enable_custom_domain
    acm_certificate_arn            = one(aws_acm_certificate_validation.site[*].certificate_arn)
    ssl_support_method             = var.enable_custom_domain ? "sni-only" : null
    minimum_protocol_version       = var.enable_custom_domain ? "TLSv1.2_2021" : null
  }
}

output "distribution_id" {
  description = "CloudFront distribution ID for asset invalidations."
  value       = aws_cloudfront_distribution.site.id
}

output "distribution_domain_name" {
  description = "CloudFront hostname for pre-cutover verification."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "site_bucket_name" {
  description = "Website bucket for the static export."
  value       = aws_s3_bucket.site.id
}
