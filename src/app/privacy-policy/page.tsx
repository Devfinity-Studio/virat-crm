export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p><strong>Effective Date:</strong> {new Date().toLocaleDateString()}</p>
        
        <h2>1. Introduction</h2>
        <p>Virat Bio Plaantec Private Limited ("we", "our", or "us") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our mobile application and CRM services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.</p>
        
        <h2>2. Information We Collect</h2>
        <p>We only collect information that is strictly necessary to provide and improve our CRM services.</p>
        <ul>
          <li>
            <strong>Location Data:</strong> We request access or permission to track location-based information from your mobile device. We collect and process your precise or approximate location data to monitor field employee activities and verify their operational status during working hours.
            <ul>
              <li><em>Foreground Location:</em> We collect your location while the app is open and in use to log your current check-in location.</li>
              <li><em>Background Location:</em> We collect location data even when the app is closed or not in use to continuously track field agents during their designated working hours.</li>
            </ul>
          </li>
          <li><strong>Personal Data:</strong> We may collect personally identifiable information, such as your name, email address, phone number, and company details, when you register for our CRM services or contact us.</li>
          <li><strong>Usage Data:</strong> We automatically collect certain information when you use the app, such as device type, operating system, and interactions with the app, to improve stability and performance.</li>
        </ul>
        
        <h2>3. How We Use Your Information</h2>
        <p>We use the information we collect primarily to provide, maintain, and support our CRM services. Specifically, we use your data (including Location Data) to:</p>
        <ul>
          <li>Facilitate core CRM functionalities, such as managing sales records and processing return records.</li>
          <li>Monitor and verify the location and working status of field employees.</li>
          <li>Manage your account and provide customer support.</li>
          <li>Respond to inquiries and send administrative information.</li>
        </ul>

        <h2>4. Data Sharing and Disclosure</h2>
        <p>We do not sell, trade, or rent your personal information or location data to third parties. We may share your information only in the following situations:</p>
        <ul>
          <li><strong>Service Providers:</strong> We may share your data with trusted third-party vendors who assist us in operating our application. These vendors are bound by strict confidentiality agreements.</li>
          <li><strong>Legal Requirements:</strong> We may disclose your data if required to do so by law, in response to a subpoena, or to protect the rights, property, and safety of Virat Bio Plaantec Private Limited or others.</li>
        </ul>

        <h2>5. Data Security</h2>
        <p>We implement reasonable administrative, technical, and physical security measures to protect your personal data. However, despite our safeguards, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure.</p>

        <h2>6. Data Retention and Deletion</h2>
        <p>We retain your personal data only for as long as necessary to fulfill the purposes outlined in this Privacy Policy. You have the right to request the deletion of your personal data at any time. Please see our <a href="/data-deletion">Data Deletion page</a> to request the removal of your account and associated data.</p>

        <h2>7. Age Restriction</h2>
        <p>Our application is intended for individuals 18 years of age or older. We do not knowingly collect personal data from children under 18. If we become aware that we have collected data from a child under 18, we will take prompt steps to delete such information.</p>
        
        <h2>8. Contact Us</h2>
        <p>If you have any questions about this privacy policy or our privacy practices, please contact us at:</p>
        <address className="not-italic">
          <strong>Virat Bio Plaantec Private Limited</strong><br />
          SECOND FLOOR, SHOP NO-213, SAHITYA ICON, NEAR SHAMSHAN GRUH, NARODA GIDC<br />
          Ahmedabad, Gujarat, 382330<br />
          Email: <a href="mailto:developer@viratbioplaantec.com">developer@viratbioplaantec.com</a>
        </address>
      </div>
    </div>
  );
}
