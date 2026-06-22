import type { Meta, StoryObj } from '@storybook/react';
import { SuggestionPills } from './SuggestionPills';

const meta = {
  component: SuggestionPills,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof SuggestionPills>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
