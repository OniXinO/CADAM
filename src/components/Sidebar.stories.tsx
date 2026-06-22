import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { Sidebar } from './Sidebar';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => <Story />;

const meta = {
  component: Sidebar,
  tags: ['autodocs'],
  decorators: [withProviders],
  argTypes: {
    isSidebarOpen: { control: 'boolean' },
  },
} satisfies Meta<typeof Sidebar>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isSidebarOpen: true,
  },
};
