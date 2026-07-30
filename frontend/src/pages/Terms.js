import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Home.css';

const Terms = () => {
  useEffect(() => {
    document.title = 'Terms of Service | Tala Mkopo Extra';
  }, []);

  return (
    <div className="container">
      <Header showHelp={false} logoInitial="T" />
      <div className="card">
        <h1>Terms of Service</h1>
        <p>
          By using Tala Mkopo Extra, you agree to our eligibility review and loan
          application policies. This service is provided for informational and
          application purposes only.
        </p>
        <h2>Loan eligibility</h2>
        <p>
          Loan approval is subject to verification and is not guaranteed. You are
          responsible for reading the fees and repayment terms before applying.
        </p>
        <h2>Responsible use</h2>
        <p>
          You agree to provide accurate information and not use the service for
          fraudulent or illegal purposes.
        </p>
        <h2>Disclaimer</h2>
        <p>
          Tala Mkopo Extra is not a bank. The service helps you review loan
          options and initiate M-Pesa payment for application fees. Actual loan
          issuance depends on third-party approval.
        </p>
      </div>
      <Footer />
    </div>
  );
};

export default Terms;
