import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { t } from '../theme'
import Ico from '../components/Icon'

// Public Terms & Conditions page (viewable logged-out). The content below is a
// starting template — the operator should have it reviewed by a lawyer and fill
// in the bracketed details before going live.
export default function TermsPage() {
  const { t: tr } = useT()

  return (
    <div style={s.wrap}>
      <div style={s.inner}>
        <Link to="/premium" style={s.back}><Ico e="←" size={16} /> {tr('common.back') || 'Back'}</Link>

        <h1 style={s.h1}>{tr('terms.title')}</h1>
        <p style={s.updated}>Last updated: 11 July 2026</p>

        <p style={s.p}>
          These Terms &amp; Conditions (“Terms”) govern your use of vivrecon (the “Service”),
          operated by [Company / sole trader name], [address] (“we”, “us”). By creating an
          account, subscribing, or using the Service you agree to these Terms. If you do not
          agree, please do not use the Service.
        </p>

        <h2 style={s.h2}>1. The Service</h2>
        <p style={s.p}>
          vivrecon is a personal budgeting tool that helps you plan income and expenses, track
          debts, savings, accounts and subscriptions, and optionally import bank statements. It
          is provided for personal, informational use only.
        </p>

        <h2 style={s.h2}>2. Eligibility &amp; account</h2>
        <p style={s.p}>
          You must be at least 18 years old to create an account. You are responsible for keeping
          your login credentials secure and for all activity under your account.
        </p>

        <h2 style={s.h2}>3. Free trial</h2>
        <p style={s.p}>
          New accounts include a 15-day Premium trial. The trial is free and requires no payment.
          When it ends, Premium features stay locked until you start a paid subscription.
        </p>

        <h2 style={s.h2}>4. Subscriptions, billing &amp; renewals</h2>
        <p style={s.p}>
          Premium is offered as a recurring subscription, billed monthly or yearly through our
          payment processor, Stripe. By subscribing you authorise us, via Stripe, to charge your
          selected payment method (card, Apple Pay, Google Pay or PayPal) the applicable price
          plus any taxes. Subscriptions renew automatically at the end of each billing period at
          the then-current price until cancelled. Prices are shown before you confirm payment.
        </p>

        <h2 style={s.h2}>5. Cancellation &amp; refunds</h2>
        <p style={s.p}>
          You can cancel at any time; your subscription then remains active until the end of the
          period you have already paid for, after which it will not renew. Except where required
          by law, payments are non-refundable and partial periods are not refunded. EU/EEA
          consumers may have statutory withdrawal rights; contact us for assistance.
        </p>

        <h2 style={s.h2}>6. Not financial advice</h2>
        <p style={s.p}>
          vivrecon provides tools, calculations and general information only. It is not financial,
          investment, tax or legal advice, and figures (including budget suggestions, debt-payoff
          estimates and imported data) may be inaccurate or incomplete. You are solely responsible
          for your financial decisions.
        </p>

        <h2 style={s.h2}>7. Third-party services</h2>
        <p style={s.p}>
          The Service relies on third parties including Stripe (payments) and, where you use them,
          AI features and bank-statement imports. Your use of those features may also be subject to
          the relevant third party’s terms. We are not responsible for third-party services.
        </p>

        <h2 style={s.h2}>8. Acceptable use</h2>
        <p style={s.p}>
          You agree not to misuse the Service, attempt to disrupt or reverse-engineer it, upload
          unlawful content, or use it to infringe others’ rights.
        </p>

        <h2 style={s.h2}>9. Data &amp; privacy</h2>
        <p style={s.p}>
          We process your data to provide the Service. Financial data you enter or import is stored
          to power your budgets. See our Privacy Policy for details on what we collect and your
          rights under applicable law (including the GDPR).
        </p>

        <h2 style={s.h2}>10. Disclaimers &amp; liability</h2>
        <p style={s.p}>
          The Service is provided “as is” without warranties of any kind. To the maximum extent
          permitted by law, we are not liable for indirect or consequential losses, or for
          financial losses arising from your use of the Service. Nothing in these Terms limits
          liability that cannot be limited by law.
        </p>

        <h2 style={s.h2}>11. Changes</h2>
        <p style={s.p}>
          We may update these Terms from time to time. Material changes will be notified in the app
          or by email. Continued use after changes take effect means you accept the updated Terms.
        </p>

        <h2 style={s.h2}>12. Governing law &amp; contact</h2>
        <p style={s.p}>
          These Terms are governed by the laws of [jurisdiction]. Questions or requests can be sent
          to [contact email].
        </p>

        <p style={s.note}>
          Note: this is a template and not legal advice. Please have it reviewed by a qualified
          lawyer and complete the bracketed details before publishing.
        </p>
      </div>
    </div>
  )
}

const s = {
  wrap:    { minHeight: '100vh', background: '#f5f6fa', padding: '32px 16px' },
  inner:   { maxWidth: 720, margin: '0 auto', background: '#fff', border: `1px solid ${t.border}`, borderRadius: 16, padding: '28px 28px 40px' },
  back:    { display: 'inline-flex', alignItems: 'center', gap: 6, color: t.navyMid, fontWeight: 600, textDecoration: 'none', fontSize: 14, marginBottom: 16 },
  h1:      { fontSize: 26, fontWeight: 800, color: t.navy, margin: '0 0 4px' },
  updated: { fontSize: 12, color: t.navyLight, margin: '0 0 20px' },
  h2:      { fontSize: 16, fontWeight: 700, color: t.navy, margin: '22px 0 6px' },
  p:       { fontSize: 14, color: '#39434f', lineHeight: 1.6, margin: 0 },
  note:    { fontSize: 12, color: t.navyLight, fontStyle: 'italic', marginTop: 24, paddingTop: 14, borderTop: `1px solid ${t.borderLight}`, lineHeight: 1.5 },
}
