export default function CookiePolicy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Cookie Policy</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
        
        <h2>1. What are Cookies?</h2>
        <p>Cookies are small text files stored on your device when you access most websites. They allow websites to remember your preferences and recognize you on subsequent visits.</p>
        
        <h2>2. How We Use Cookies</h2>
        <p>Virat Bio Plaantec private limited uses cookies primarily for essential functional purposes, such as:</p>
        <ul>
          <li>Keeping you securely logged into the CRM.</li>
          <li>Remembering your consent preferences (so we don't repeatedly show you the cookie banner).</li>
          <li>Maintaining session integrity and application security.</li>
        </ul>
        
        <h2>3. Third-Party Cookies</h2>
        <p>We do not sell your data or use intrusive third-party tracking or advertising cookies.</p>
        
        <h2>4. Managing Cookies</h2>
        <p>You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our CRM securely.</p>
        
        <h2>5. Contact Information</h2>
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
