mock_provider "aws" {
  override_during = plan

  mock_data "aws_route53_zone" {
    defaults = {
      name = "yingw787.com"
    }
  }
}

mock_provider "aws" {
  alias = "virginia"
}

variables {
  site_bucket_name = "example-yingw787-site"
}

run "no_dns_changes_by_default" {
  command = plan

  assert {
    condition = (
      length(aws_route53_record.apex_ipv4) == 0 &&
      length(aws_route53_record.cloudfront) == 0 &&
      length(aws_route53_record.certificate) == 0 &&
      length(aws_acm_certificate.site) == 0
    )
    error_message = "The default preview must leave production DNS and certificate validation records alone."
  }
}

run "certificate_before_traffic_cutover" {
  command = plan

  variables {
    enable_custom_domain = true
    route53_zone_id      = "Z123EXAMPLE"
  }

  assert {
    condition = (
      aws_acm_certificate.site[0].domain_name == "yingw787.com" &&
      toset(aws_cloudfront_distribution.site.aliases) == toset(["yingw787.com"]) &&
      toset(keys(aws_route53_record.certificate)) == toset(["yingw787.com"]) &&
      length(aws_route53_record.apex_ipv4) == 0 &&
      length(aws_route53_record.cloudfront) == 0
    )
    error_message = "Enabling the custom domain must issue a cert and attach the apex without moving traffic."
  }
}

run "cutover_with_optional_www" {
  command = plan

  variables {
    enable_custom_domain = true
    route53_zone_id      = "Z123EXAMPLE"
    dns_target           = "cloudfront"
    enable_www           = true
  }

  assert {
    condition = (
      toset(aws_cloudfront_distribution.site.aliases) == toset(["yingw787.com", "www.yingw787.com"]) &&
      length(aws_route53_record.apex_ipv4[0].alias) == 1 &&
      toset(keys(aws_route53_record.cloudfront)) == toset(["apex-AAAA", "www-A", "www-AAAA"])
    )
    error_message = "An approved cutover must use CloudFront aliases for IPv4 and IPv6."
  }
}

run "firebase_rollback" {
  command = plan

  variables {
    enable_custom_domain = true
    route53_zone_id      = "Z123EXAMPLE"
    dns_target           = "firebase"
  }

  assert {
    condition = (
      aws_route53_record.apex_ipv4[0].records == toset(["199.36.158.100"]) &&
      aws_route53_record.apex_ipv4[0].ttl == 60 &&
      length(aws_route53_record.cloudfront) == 0 &&
      length(aws_route53_record.certificate) == 1
    )
    error_message = "Rollback must restore the Firebase A record and remove traffic aliases, but retain the certificate."
  }
}
