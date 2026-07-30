import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Home.css';

const Privacy = () => {
  useEffect(() => {
    document.title = 'Privacy Policy | Tala Mkopo Extra';
  }, []);

  return (
    <div className="container">
      <Header showHelp={false} logoInitial="T" />
      <div className="card">
        <h1>Privacy Policy</h1>
        <p>
          Tala Mkopo Extra respects your privacy and processes your information
          only to provide the loan application experience. We do not sell your
          personal data.
        </p>
        <h2>What we collect</h2>
        <p>
          We may collect contact information, phone number, name, and usage data
          to help validate loan eligibility and improve the app.
        </p>
        <h2>How we use your information</h2>
        <p>
          We use data for authentication, loan application flow, customer
          support, and to maintain security. Data is not shared with third parties
          except where required to process payments and comply with the law.
        </p>
        <h2>Cookies and local storage</h2>
        <p>
          This application may use browser storage and cookies to remember your
          session, support state recovery, and keep the user experience smooth.
        </p>
        <h2>Disclosure and support</h2>
        <p>
          If you have questions about this policy, please visit the Contact page
          or email us through the support channel provided there.
        </p>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;
