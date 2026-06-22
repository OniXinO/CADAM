import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { UpgradeModal } from './UpgradeModal';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => <Story />;

const meta = {
  component: UpgradeModal,
  tags: ['autodocs'],
  decorators: [withProviders],
  argTypes: {
    open: { control: 'boolean' },
  },
} satisfies Meta<typeof UpgradeModal>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: false,
  },
};

export const Open: Story = {
  args: {
    open: true,
  },
};
