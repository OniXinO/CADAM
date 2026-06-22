import type { Meta, StoryObj } from '@storybook/react';
import { MeshImagePreview } from './MeshImagePreview';

const meta = {
  component: MeshImagePreview,
  tags: ['autodocs'],
} satisfies Meta<typeof MeshImagePreview>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
