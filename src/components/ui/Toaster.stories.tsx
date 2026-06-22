import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { Toaster } from './toaster';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => <Story />;

const meta = {
  component: Toaster,
  tags: ['autodocs'],
  decorators: [withProviders],
} satisfies Meta<typeof Toaster>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
