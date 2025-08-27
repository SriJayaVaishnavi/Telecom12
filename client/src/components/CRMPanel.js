import React from 'react';

const CRMPanel = ({ customer }) => {
  return (
    <div className="card">
      <h4>CRM Profile</h4>
      <ul>
        <li><strong>Name:</strong> {customer.name}</li>
        <li><strong>Plan:</strong> {customer.plan}</li>
        <li><strong>ONT Model:</strong> {customer.ont_model}</li>
        <li><strong>ONT Firmware:</strong> {customer.ont_firmware}</li>
        <li><strong>Tenure:</strong> {customer.tenure_years} years</li>
        <li><strong>Risk Score:</strong> {customer.risk_score}</li>
        <li><strong>Open Cases:</strong> {customer.open_cases}</li>
        <li><strong>Area Outage:</strong> {customer.area_outage ? 'Yes' : 'No'}</li>
      </ul>
    </div>
  );
};

export default CRMPanel;
