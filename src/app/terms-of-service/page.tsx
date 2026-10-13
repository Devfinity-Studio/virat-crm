export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
        
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using the services provided by Virat Bio Plaantec private limited, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
        
        <h2>2. Use of Service</h2>
        <p>Our CRM is intended for internal business management and authorized users only. You must be at least 18 years old to use this service.</p>

        <h2>3. Transparency and Fees</h2>
        <p>We are committed to providing a transparent experience. There are no hidden fees or deceptive design practices (dark patterns) used in our application.</p>
        
        <h2>4. Termination</h2>
        <p>We reserve the right to suspend or terminate your access to our services if you violate these Terms or for any other operational reason.</p>
        
        <h2>5. Contact Information</h2>
        <p>For any inquiries regarding these Terms, please contact us at:</p>
        <address className="not-italic">
          <strong>Virat Bio Plaantec private limited</strong><br />
          SECOND FLOOR, SHOP NO-213, SAHITYA ICON, NEAR SHAMSHAN GRUH, NARODA GIDC<br />
          Ahmedabad, Gujarat, 382330<br />
          Email: <a href="mailto:developer@viratbioplaantec.com">developer@viratbioplaantec.com</a>
        </address>
      </div>
    </div>
  );
}
