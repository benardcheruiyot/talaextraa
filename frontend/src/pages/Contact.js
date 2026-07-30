import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Home.css';

const Contact = () => {
  useEffect(() => {
    document.title = 'Contact | Tala Mkopo Extra';
  }, []);

  return (
    <div className="container">
      <Header showHelp={false} logoInitial="T" />
      <div className="card">
        <h1>Contact Us</h1>
        <p>
          Need help with your loan application or want to ask about our terms?
          Reach out below.
        </p>
        <h2>Customer support</h2>
        <p>Email: support@talamkopoextra.com</p>
        <p>Phone: +254 700 000 000</p>
        <h2>Office hours</h2>
        <p>Monday to Friday, 9:00 AM to 5:00 PM EAT</p>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;
