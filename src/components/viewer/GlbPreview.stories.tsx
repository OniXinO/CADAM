import type { Meta, StoryObj } from '@storybook/react';
import { GlbPreview } from './GlbPreview';

const meta = {
  component: GlbPreview,
  tags: ['autodocs'],
} satisfies Meta<typeof GlbPreview>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
