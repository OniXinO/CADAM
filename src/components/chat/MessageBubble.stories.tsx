import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { MessageBubble } from './MessageBubble';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => (
  <div
    style={{ padding: '20px', backgroundColor: '#0a0a0a', minHeight: '200px' }}
  >
    <Story />
  </div>
);

const meta = {
  component: MessageBubble,
  tags: ['autodocs'],
  decorators: [withProviders],
  argTypes: {
    isLoading: { control: 'boolean' },
    isLastMessage: { control: 'boolean' },
  },
} satisfies Meta<typeof MessageBubble>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isLoading: false,
    isLastMessage: true,
  },
};
