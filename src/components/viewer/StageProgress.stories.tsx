import type { Meta, StoryObj } from '@storybook/react';
import { StageProgress } from './StageProgress';

const meta = {
  component: StageProgress,
  tags: ['autodocs'],
} satisfies Meta<typeof StageProgress>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
