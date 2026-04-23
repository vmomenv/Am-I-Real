import { render, screen } from '@testing-library/react';

import { VerificationExperience } from '../VerificationExperience';

describe('VerificationExperience', () => {
  it('renders the Groundflare verification shell heading', () => {
    render(<VerificationExperience />);

    expect(
      screen.getByRole('heading', { name: /groundflare verification/i }),
    ).toBeInTheDocument();
  });
});
