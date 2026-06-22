import type { Meta, StoryObj } from '@storybook/react';
import { VisualCard } from './VisualCard';

const meta = {
  component: VisualCard,
  tags: ['autodocs'],
} satisfies Meta<typeof VisualCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
