# Footer Component Usage

## Overview

The Footer component has been created for your TicketRunners Organizers app. It includes full RTL (Right-to-Left) support for Arabic language and uses the existing translation system.

## Features

- ✅ Full RTL support for Arabic language
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Dark/Light theme support
- ✅ Translation support (English & Arabic)
- ✅ Social media links
- ✅ Contact information
- ✅ Quick navigation links
- ✅ Legal links
- ✅ Technical support section

## How to Use

### 1. Basic Usage

```tsx
import { Footer } from "@/components/Footer";

const MyPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Your main content */}
      <main className="flex-1">{/* Your page content here */}</main>

      {/* Footer at the bottom */}
      <Footer />
    </div>
  );
};
```

### 2. Layout Structure

The footer should be placed in a flex container with `min-h-screen` and `flex flex-col` to ensure it stays at the bottom:

```tsx
<div className="min-h-screen flex flex-col">
  <main className="flex-1">{/* Your content */}</main>
  <Footer />
</div>
```

### 3. Demo Page

A demo page has been created at `/demo` route to showcase the footer functionality. You can visit it to see the footer in action.

## Translation Keys

The footer uses these translation keys (already available in your locales):

### English (EN.json)

```json
{
  "footer": {
    "tagline": "Your trusted ticket marketplace in Egypt...",
    "quickLinks": "Quick Links",
    "aboutUs": "About Us",
    "contactUs": "Contact Us",
    "howItWorks": "How It Works",
    "nearbyMerchants": "Nearby Merchants",
    "legal": "Legal",
    "faqs": "FAQs",
    "terms": "Terms & Conditions",
    "privacy": "Privacy Policy",
    "refund": "Refund Policy",
    "contact": "Contact",
    "location": "Cairo, Egypt",
    "trustTagline": "Your Trusted Ticket Marketplace",
    "technicalSupport": "Technical Support",
    "poweredBy": "Powered by",
    "logoAlt": "Ticket Runners Logo",
    "phoneLabel": "+20 122 652 1747",
    "emailLabel": "support@ticketrunners.com",
    "copyright": "TicketRunners",
    "floki": "Floki Systems"
  }
}
```

### Arabic (AR.json)

All the same keys are available in Arabic with proper translations.

## Customization

### 1. Logo Images

The footer looks for these logo files:

- Dark theme: `/src/assets/ticket-logo.png`
- Light theme: `/public/ticket-logo-secondary.png`

### 2. Social Media Links

Currently includes Instagram link. You can modify the social media section in the Footer component.

### 3. Contact Information

The footer displays:

- Phone: +20 122 652 1747
- Email: support@ticketrunners.com
- Location: Cairo, Egypt

### 4. Navigation Links

The footer includes navigation to these routes:

- `/about` - About Us
- `/contact` - Contact Us
- `/how-it-works` - How It Works
- `/nearby-merchants` - Nearby Merchants
- `/faqs` - FAQs
- `/terms` - Terms & Conditions
- `/privacy` - Privacy Policy
- `/refund-policy` - Refund Policy

## Dependencies

The Footer component uses these existing dependencies:

- `@/components/ui/button` - For social media buttons
- `lucide-react` - For icons
- `@/hooks/use-toast` - For toast notifications
- `react-i18next` - For translations
- `@/hooks/useTheme` - For theme support

## Testing

1. Visit `/demo` to see the footer in action
2. Switch between English and Arabic to test RTL support
3. Switch between light and dark themes
4. Test responsive design on different screen sizes

## Integration with Existing Pages

To add the footer to your existing pages, simply import and add it at the bottom of your page layout:

```tsx
import { Footer } from "@/components/Footer";

// In your existing page component
return (
  <div className="min-h-screen flex flex-col">
    {/* Your existing page content */}
    <Footer />
  </div>
);
```
