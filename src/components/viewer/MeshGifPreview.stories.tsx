import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { MeshGifPreview } from './MeshGifPreview';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => <Story />;

const meta = {
  component: MeshGifPreview,
  tags: ['autodocs'],
  decorators: [withProviders],
} satisfies Meta<typeof MeshGifPreview>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
