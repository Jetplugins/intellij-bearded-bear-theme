# JetBrains Marketplace Listing Configuration

## Plugin Information
- **Plugin ID**: dev.jetplugins.beardedtheme
- **Name**: Bearded Theme
- **Category**: UI Themes

## Pricing Model
- **Type**: Subscription (Freemium)
- **Monthly Price**: $1.00 USD/month
- **Annual Price**: $10.00 USD/year (2 months free)
- **Product Code**: PBEARDEDTHEME

## Marketplace Setup Instructions

### 1. Upload Plugin
Upload the built `.zip` from `build/distributions/` to https://plugins.jetbrains.com

### 2. Configure Paid Plugin
1. Go to plugin settings → Pricing
2. Select "Paid" plugin type
3. Set pricing tier:
   - Monthly: $1.00
   - Annual: $10.00
4. Enable "Freemium" mode — the `optional="true"` attribute in `product-descriptor`
   means the plugin works without a license but prompts for subscription

### 3. Product Descriptor
The `plugin.xml` contains:
```xml
<product-descriptor code="PBEARDEDTHEME" release-date="20240101" release-version="10" optional="true"/>
```

- `code` = unique product code for licensing
- `optional="true"` = freemium model (theme works without subscription, but user gets a prompt)
- `release-date` = date of first release (YYYYMMDD format)
- `release-version` = numeric version for license tracking

### 4. License Validation
The `BeardedThemeLicenseCheck` class validates the subscription on project open
via `LicensingFacade.getLicensedVersion("PBEARDEDTHEME")`. If unlicensed, it
logs a warning but does not block functionality.

### 5. Signing
Set these environment variables for plugin signing:
```bash
export CERTIFICATE_CHAIN="<your-certificate-chain>"
export PRIVATE_KEY="<your-private-key>"
export PRIVATE_KEY_PASSWORD="<your-password>"
export PUBLISH_TOKEN="<your-marketplace-token>"
```

Then run:
```bash
./gradlew signPlugin
./gradlew publishPlugin
```

## Revenue Information
JetBrains takes a 25% commission on marketplace sales:
- $1.00/month → $0.75 net per subscriber per month
- $10.00/year → $7.50 net per subscriber per year
