import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { Subscriptions } from './Subscriptions';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => (
  <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
    <Story />
  </div>
);

const meta = {
  component: Subscriptions,
  tags: ['autodocs'],
  decorators: [withProviders],
} satisfies Meta<typeof Subscriptions>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
