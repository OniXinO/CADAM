import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { ChatSession } from './ChatSession';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => (
  <div style={{ height: '600px' }}>
    <Story />
  </div>
);

const meta = {
  component: ChatSession,
  tags: ['autodocs'],
  decorators: [withProviders],
  argTypes: {
    isDisabled: { control: 'boolean' },
  },
} satisfies Meta<typeof ChatSession>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isDisabled: false,
  },
};
