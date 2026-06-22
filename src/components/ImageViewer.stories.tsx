import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { ConversationContext } from '@/contexts/ConversationContext';
import { ImageViewer } from './ImageViewer';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => (
  <ConversationContext.Provider
    value={{
      conversation: {
        id: 'conv_img',
        title: 'Generated 3D Model Render',
        type: 'parametric',
        privacy: 'private',
        current_message_leaf_id: null,
        user_id: 'user_123',
        created_at: '2024-06-21T10:00:00Z',
        updated_at: '2024-06-21T14:30:00Z',
        settings: null,
      },
    }}
  >
    <Story />
  </ConversationContext.Provider>
);

const meta = {
  component: ImageViewer,
  tags: ['autodocs'],
  decorators: [withProviders],
} satisfies Meta<typeof ImageViewer>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
