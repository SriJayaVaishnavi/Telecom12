import React from 'react';

const HeaderBar = ({ agent, customer }) => {
  return (
    <header className="header-bar">
      <h1>Agent Desktop</h1>
      <div>
        <span>Agent: {agent.name}</span> | <span>Caller: {customer.name}</span>
      </div>
    </header>
  );
};

export default HeaderBar;
