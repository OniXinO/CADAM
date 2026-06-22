import type { Meta, StoryObj } from '@storybook/react';
import { MeshPreview } from './MeshPreview';

const meta = {
  component: MeshPreview,
  tags: ['autodocs'],
} satisfies Meta<typeof MeshPreview>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
