import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { ConversationContext } from '@/contexts/ConversationContext';
import { ModelSelector } from './ModelSelector';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => (
  <ConversationContext.Provider
    value={{
      conversation: {
        id: 'conv_xyz',
        title: 'Gear Design',
        type: 'parametric',
        privacy: 'private',
        current_message_leaf_id: null,
        user_id: 'user_123',
        created_at: '2024-06-20T10:00:00Z',
        updated_at: '2024-06-21T14:00:00Z',
        settings: null,
      },
    }}
  >
    <Story />
  </ConversationContext.Provider>
);

const meta = {
  component: ModelSelector,
  tags: ['autodocs'],
  decorators: [withProviders],
  argTypes: {
    selectedModel: { control: 'text' },
    disabled: { control: 'boolean' },
    type: { control: 'select', options: ['parametric', 'creative'] },
    focused: { control: 'boolean' },
  },
} satisfies Meta<typeof ModelSelector>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    selectedModel: 'claude-opus-4-1',
    disabled: false,
    type: 'parametric',
    focused: false,
  },
};

export const Disabled: Story = {
  args: {
    selectedModel: 'claude-opus-4-1',
    disabled: true,
    type: 'parametric',
    focused: false,
  },
};

export const Creative: Story = {
  args: {
    selectedModel: 'claude-opus-4-1',
    disabled: false,
    type: 'creative',
    focused: false,
  },
};
