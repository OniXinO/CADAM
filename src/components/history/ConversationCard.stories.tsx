import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { ConversationCard } from './ConversationCard';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => (
  <div style={{ padding: '20px', backgroundColor: '#0a0a0a' }}>
    <Story />
  </div>
);

const meta = {
  component: ConversationCard,
  tags: ['autodocs'],
  decorators: [withProviders],
  argTypes: {
    isEditing: { control: 'boolean' },
  },
} satisfies Meta<typeof ConversationCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isEditing: false,
  },
};
