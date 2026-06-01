import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Privacy Policy — VissionLink",
  description: "How BMR Cinema Operation Services collects and processes personal data on VissionLink, under the Data Privacy Act of 2012.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated={COMPANY.legalUpdated} active="privacy">
      <p>
        This Privacy Policy explains how <strong>{COMPANY.legalName}</strong> (TIN {COMPANY.tin}), operator of{" "}
        <strong>{COMPANY.domain}</strong> (&quot;VissionLink&quot;), collects, uses, and protects your personal data in
        accordance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>, its Implementing Rules and
        Regulations, and issuances of the National Privacy Commission (NPC). For this Policy, {COMPANY.legalName} is the{" "}
        <strong>Personal Information Controller</strong>.
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Identity &amp; contact:</strong> name, email, mobile number, company/production name.</li>
        <li><strong>Booking details:</strong> equipment selected, rental dates, handoff preference, notes you provide.</li>
        <li><strong>Payment information:</strong> processed by our payment provider (PayMongo). We do not store full card numbers.</li>
        <li><strong>Technical data:</strong> device, browser, and usage information, including cookies and similar technologies.</li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <ul>
        <li>To process reservation requests, confirm availability, and coordinate handover with the relevant Owner.</li>
        <li>To process payments and issue the corresponding receipts.</li>
        <li>To provide customer support and send service-related communications.</li>
        <li>To comply with legal, tax (BIR), and regulatory obligations.</li>
        <li>To improve and secure the Platform.</li>
      </ul>

      <h2>3. Legal Bases for Processing</h2>
      <p>
        We process personal data based on your <strong>consent</strong>, the <strong>performance of a contract</strong> (your
        booking), our <strong>legal obligations</strong>, and our <strong>legitimate interests</strong> in operating the
        Platform, consistent with the Data Privacy Act.
      </p>

      <h2>4. Sharing &amp; Disclosure</h2>
      <ul>
        <li><strong>Equipment Owners</strong> — limited contact and booking details needed to fulfil your rental.</li>
        <li><strong>Service providers</strong> — payment (PayMongo), logistics/delivery partners, and IT/hosting providers, under appropriate safeguards.</li>
        <li><strong>Authorities</strong> — when required by law or lawful order (e.g., BIR, NPC, courts).</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>5. Cookies</h2>
      <p>
        We use cookies and local storage to keep your cart, remember preferences, and understand site usage. You can control
        cookies through your browser settings; disabling them may affect some features.
      </p>

      <h2>6. Data Retention</h2>
      <p>
        We retain personal data only for as long as necessary to fulfil the purposes above and to comply with legal and tax
        requirements (including BIR record-keeping), after which it is securely disposed of.
      </p>

      <h2>7. Your Rights as a Data Subject</h2>
      <p>Under the Data Privacy Act, you have the right to:</p>
      <ul>
        <li>be informed about the processing of your personal data;</li>
        <li>access your personal data;</li>
        <li>object to processing and to rectify inaccurate data;</li>
        <li>request erasure or blocking;</li>
        <li>data portability;</li>
        <li>be indemnified for damages; and</li>
        <li>lodge a complaint with the National Privacy Commission.</li>
      </ul>

      <h2>8. Security</h2>
      <p>
        We implement reasonable organizational, physical, and technical measures to protect personal data against
        unauthorized access, loss, or misuse.
      </p>

      <h2>9. Children</h2>
      <p>The Platform is intended for users 18 and older. We do not knowingly collect data from minors.</p>

      <h2>10. Changes</h2>
      <p>We may update this Policy. Material changes will be posted on this page with a revised &quot;last updated&quot; date.</p>

      <h2>11. Contact Us</h2>
      <p>
        For privacy concerns or to exercise your rights, contact {COMPANY.legalName} at{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> — {COMPANY.address}.
      </p>
    </LegalShell>
  );
}
