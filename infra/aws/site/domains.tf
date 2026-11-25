variable "route53_zone_id" {
  type        = string
  description = "ID of the existing, publicly delegated yingw787.com Route 53 hosted zone."
  default     = null

  validation {
    condition = (
      !var.enable_custom_domain && var.dns_target == "unmanaged" ||
      can(regex("^Z[A-Z0-9]+$", var.route53_zone_id))
    )
    error_message = "A Route 53 hosted zone ID is required to configure the custom domain or manage DNS."
  }
}

variable "enable_custom_domain" {
  type        = bool
  description = "Issue the ACM certificate and attach the domain to CloudFront without switching traffic."
  default     = false
}

variable "enable_www" {
  type        = bool
  description = "Also configure www.yingw787.com, which does not currently resolve."
  default     = false
}

variable "dns_target" {
  type        = string
  description = "Leave the existing DNS unmanaged, point DNS to CloudFront, or roll the managed apex back to Firebase."
  default     = "unmanaged"

  validation {
    condition = (
      contains(["unmanaged", "firebase", "cloudfront"], var.dns_target) &&
      (var.dns_target != "cloudfront" || var.enable_custom_domain)
    )
    error_message = "Use unmanaged, firebase, or cloudfront. CloudFront DNS also requires enable_custom_domain."
  }
}

locals {
  custom_domains = var.enable_custom_domain ? toset(concat([local.domain], var.enable_www ? ["www.${local.domain}"] : [])) : toset([])
  cloudfront_dns = var.dns_target == "cloudfront"
}

provider "aws" {
  alias  = "virginia"
  region = "us-east-1"
}

data "aws_route53_zone" "existing" {
  count        = var.enable_custom_domain || var.dns_target != "unmanaged" ? 1 : 0
  zone_id      = var.route53_zone_id
  private_zone = false

  lifecycle {
    postcondition {
      condition     = self.name == local.domain && self.private_zone == false
      error_message = "Use the existing public yingw787.com hosted zone."
    }
  }
}

resource "aws_acm_certificate" "site" {
  provider                  = aws.virginia
  count                     = var.enable_custom_domain ? 1 : 0
  domain_name               = local.domain
  subject_alternative_names = sort(tolist(setsubtract(local.custom_domains, [local.domain])))
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

locals {
  certificate_dns = var.enable_custom_domain ? {
    for record in aws_acm_certificate.site[0].domain_validation_options : record.domain_name => record
  } : {}
}

resource "aws_route53_record" "certificate" {
  for_each = local.custom_domains
  zone_id  = data.aws_route53_zone.existing[0].zone_id
  name     = local.certificate_dns[each.key].resource_record_name
  type     = local.certificate_dns[each.key].resource_record_type
  records  = [local.certificate_dns[each.key].resource_record_value]
  ttl      = 300
}

resource "aws_acm_certificate_validation" "site" {
  provider                = aws.virginia
  count                   = var.enable_custom_domain ? 1 : 0
  certificate_arn         = aws_acm_certificate.site[0].arn
  validation_record_fqdns = [for record in aws_route53_record.certificate : record.fqdn]
}

resource "aws_route53_record" "apex_ipv4" {
  count   = var.dns_target == "unmanaged" ? 0 : 1
  zone_id = data.aws_route53_zone.existing[0].zone_id
  name    = local.domain
  type    = "A"
  ttl     = local.cloudfront_dns ? null : 60
  records = local.cloudfront_dns ? null : ["199.36.158.100"]

  dynamic "alias" {
    for_each = local.cloudfront_dns ? [aws_cloudfront_distribution.site] : []
    content {
      name                   = alias.value.domain_name
      zone_id                = alias.value.hosted_zone_id
      evaluate_target_health = false
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_route53_record" "cloudfront" {
  for_each = toset(!local.cloudfront_dns ? [] : concat(["apex-AAAA"], var.enable_www ? ["www-A", "www-AAAA"] : []))
  zone_id  = data.aws_route53_zone.existing[0].zone_id
  name     = startswith(each.key, "www-") ? "www.${local.domain}" : local.domain
  type     = split("-", each.key)[1]

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

output "route53_name_servers" {
  description = "Verify these match the live Route 53 delegation before any change."
  value       = one(data.aws_route53_zone.existing[*].name_servers)
}
