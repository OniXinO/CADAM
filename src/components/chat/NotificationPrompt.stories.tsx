import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { NotificationPrompt } from './NotificationPrompt';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => <Story />;

const meta = {
  component: NotificationPrompt,
  tags: ['autodocs'],
  decorators: [withProviders],
  argTypes: {
    shouldShow: { control: 'boolean' },
  },
} satisfies Meta<typeof NotificationPrompt>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    shouldShow: true,
  },
};
