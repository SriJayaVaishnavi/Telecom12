import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the initial idle screen', () => {
  render(<App />);
  const idleElement = screen.getByText(/Agent is Idle/i);
  expect(idleElement).toBeInTheDocument();

  const buttonElement = screen.getByRole('button', { name: /Simulate Incoming Call/i });
  expect(buttonElement).toBeInTheDocument();
});
