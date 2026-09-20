export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
        
        <h2>1. Introduction</h2>
        <p>Virat Bio Plaantec private limited ("we", "our", or "us") respects your privacy and is committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.</p>
        
        <h2>2. Data Collection</h2>
        <p>We only collect data necessary to provide you with our CRM and application services. We do not collect unnecessary data.</p>
        
        <h2>3. Age Restriction</h2>
        <p>Our application is intended for individuals 18 years of age or older. We do not knowingly collect personal data from children under 18.</p>

        <h2>4. Your Rights</h2>
        <p>Depending on your location, you may have rights under the GDPR, CCPA, or other privacy laws to access, correct, or delete your personal data. Please see our <a href="/data-deletion">Data Deletion page</a> to request removal.</p>
        
        <h2>5. Contact Us</h2>
        <p>If you have any questions about this privacy policy or our privacy practices, please contact us at:</p>
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
