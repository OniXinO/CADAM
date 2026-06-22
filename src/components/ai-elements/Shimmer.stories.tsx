import type { Meta, StoryObj } from '@storybook/react';
import { Shimmer } from './shimmer';

const meta = {
  component: Shimmer,
  tags: ['autodocs'],
} satisfies Meta<typeof Shimmer>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
