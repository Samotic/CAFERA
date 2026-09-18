import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, IconButton } from './Button';
import { Checkbox, Field, Input } from './Field';
import { RatingDisplay, RatingInput } from './Rating';
import { ChipToggle } from './Chip';

/**
 * These test the accessibility contracts of the primitives, not their styling.
 *
 * Every assertion here corresponds to a WCAG requirement the whole product then
 * inherits: an icon button must have a name, an invalid field must be linked to
 * its error, a toggle must expose its pressed state, and a rating must be
 * readable as a number rather than as a row of glyphs. Getting these right once,
 * here, is what keeps the axe run clean across forty screens later.
 */

describe('Button', () => {
  it('defaults to type="button" so it cannot submit a form by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('marks itself busy and disabled while loading', () => {
    render(
      <Button isLoading loadingLabel="Saving">
        Save
      </Button>,
    );
    const button = screen.getByRole('button');

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    // The state is announced, not merely spun.
    expect(screen.getByText('Saving')).toBeInTheDocument();
  });

  it('does not fire while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        Save
      </Button>,
    );

    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('IconButton', () => {
  it('always carries an accessible name', () => {
    render(
      <IconButton label="Add to favourites">
        <svg />
      </IconButton>,
    );
    // Without this an icon-only control is simply invisible to a screen reader.
    expect(screen.getByRole('button', { name: 'Add to favourites' })).toBeInTheDocument();
  });
});

describe('Field', () => {
  it('links the label to the control', async () => {
    render(<Field label="Email">{(props) => <Input type="email" {...props} />}</Field>);

    const input = screen.getByLabelText('Email');
    expect(input).toBeInTheDocument();

    // Clicking the label must focus the control.
    await userEvent.click(screen.getByText('Email'));
    expect(input).toHaveFocus();
  });

  it('wires an error to the control and announces it', () => {
    render(
      <Field label="Email" error="Enter a valid email address">
        {(props) => <Input type="email" {...props} />}
      </Field>,
    );

    const input = screen.getByLabelText('Email');
    const error = screen.getByRole('alert');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
    expect(error).toHaveTextContent('Enter a valid email address');
  });

  it('hides the hint once an error replaces it, so only one message is read', () => {
    render(
      <Field label="Password" hint="At least 8 characters" error="Too short">
        {(props) => <Input type="password" {...props} />}
      </Field>,
    );

    expect(screen.queryByText('At least 8 characters')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
  });
});

describe('Checkbox', () => {
  it('toggles when the label text is clicked', async () => {
    render(<Checkbox label="120 ml milk" />);
    const checkbox = screen.getByRole('checkbox', { name: '120 ml milk' });

    await userEvent.click(screen.getByText('120 ml milk'));
    expect(checkbox).toBeChecked();
  });
});

describe('ChipToggle', () => {
  it('exposes its state through aria-pressed, not colour', () => {
    const { rerender } = render(<ChipToggle isSelected={false}>Hot</ChipToggle>);
    expect(screen.getByRole('button', { name: 'Hot' })).toHaveAttribute('aria-pressed', 'false');

    rerender(<ChipToggle isSelected>Hot</ChipToggle>);
    expect(screen.getByRole('button', { name: 'Hot' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('RatingDisplay', () => {
  it('states the rating as a number for assistive tech', () => {
    render(<RatingDisplay value={4.8} count={126} />);
    expect(screen.getByText(/Rated 4.8 out of 5 from 126 reviews/)).toBeInTheDocument();
  });

  it('uses the singular for a single review', () => {
    render(<RatingDisplay value={5} count={1} />);
    expect(screen.getByText(/from 1 review$/)).toBeInTheDocument();
  });
});

describe('RatingInput', () => {
  it('is a radio group, so it is keyboard operable', () => {
    render(<RatingInput name="rating" value={0} onChange={vi.fn()} />);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
    expect(screen.getByRole('group', { name: 'Your rating' })).toBeInTheDocument();
  });

  it('reports the chosen value', async () => {
    const onChange = vi.fn();
    render(<RatingInput name="rating" value={0} onChange={onChange} />);

    await userEvent.click(screen.getByRole('radio', { name: '4 stars' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('announces the current selection in text', () => {
    render(<RatingInput name="rating" value={3} onChange={vi.fn()} />);
    expect(screen.getByText('3 of 5')).toBeInTheDocument();
  });
});
