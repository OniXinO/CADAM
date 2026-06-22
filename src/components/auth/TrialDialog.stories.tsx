import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { TrialDialog } from './TrialDialog';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => (
  <div>
    <Story />
  </div>
);

const meta = {
  component: TrialDialog,
  tags: ['autodocs'],
  decorators: [withProviders],
} satisfies Meta<typeof TrialDialog>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
