import { Button } from "@/components/ui/button";

export default function DataDeletion() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Data Deletion Request</h1>
      <div className="prose dark:prose-invert max-w-none mb-8">
        <p>
          At Virat Bio Plaantec private limited, we respect your right to privacy and your right to be forgotten. 
          If you wish to have your account and all associated personal data permanently removed from our CRM system, you may request data deletion here.
        </p>
        
        <h2>How it works</h2>
        <ol>
          <li>Send a data deletion request using the email link below.</li>
          <li>Please include your full name and employee ID (if applicable) in the email.</li>
          <li>Our system administrators will verify your identity.</li>
          <li>Upon verification, all your personal data will be wiped from our databases within 30 days.</li>
        </ol>
        
        <h2>Contact Information</h2>
        <p>If you prefer, you can also send a written request to:</p>
        <address className="not-italic">
          <strong>Virat Bio Plaantec private limited</strong><br />
          SECOND FLOOR, SHOP NO-213, SAHITYA ICON, NEAR SHAMSHAN GRUH, NARODA GIDC<br />
          Ahmedabad, Gujarat, 382330
        </address>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <a href="mailto:developer@viratbioplaantec.com?subject=Data Deletion Request&body=Hello,%0D%0A%0D%0AI would like to request the deletion of my account and all associated personal data from the Virat CRM system.%0D%0A%0D%0AMy Details:%0D%0A- Full Name: [Your Name]%0D%0A- Employee Code: [Your Code (if known)]%0D%0A%0D%0AThank you.">
          <Button size="lg" className="w-full sm:w-auto">Request Data Deletion via Email</Button>
        </a>
      </div>
    </div>
  );
}
