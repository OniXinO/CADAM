import type { Meta, StoryObj } from '@storybook/react';
import { ShareContent } from './ShareContent';

const meta = {
  component: ShareContent,
  tags: ['autodocs'],
  argTypes: {
    conversationId: { control: 'text' },
    privacy: { control: 'select', options: ['public', 'private'] },
    meshId: { control: 'text' },
    openscadCode: { control: 'text' },
  },
} satisfies Meta<typeof ShareContent>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    conversationId: 'conv_7a3f2e',
    privacy: 'public',
    meshId: 'mesh_9k2x1',
    openscadCode: `difference() {
  cube([30, 30, 30]);
  sphere(18);
}`,
  },
};

export const Private: Story = {
  args: {
    conversationId: 'conv_7a3f2e',
    privacy: 'private',
    meshId: 'mesh_9k2x1',
    openscadCode: `difference() {
  cube([30, 30, 30]);
  sphere(18);
}`,
  },
};
