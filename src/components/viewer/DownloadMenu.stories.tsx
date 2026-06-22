import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { DownloadMenu } from './DownloadMenu';

// This component reads context. The fill step replaces this
// pass-through with the provider wrapper it needs to render.
const withProviders: Decorator = (Story) => (
  <div>
    <Story />
  </div>
);

const meta = {
  component: DownloadMenu,
  tags: ['autodocs'],
  decorators: [withProviders],
} satisfies Meta<typeof DownloadMenu>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
