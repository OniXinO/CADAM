import type { Meta, StoryObj } from '@storybook/react';
import FreeTrialButton from './FreeTrialButton';

const meta = {
  component: FreeTrialButton,
  tags: ['autodocs'],
  argTypes: {
    text: { control: 'text' },
    disabled: { control: 'boolean' },
    isPending: { control: 'boolean' },
  },
} satisfies Meta<typeof FreeTrialButton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: 'Start Free Trial',
    disabled: false,
    isPending: false,
  },
};

export const Disabled: Story = {
  args: {
    text: 'Start Free Trial',
    disabled: true,
    isPending: false,
  },
};
