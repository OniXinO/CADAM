import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './progress';

const meta = {
  component: Progress,
  tags: ['autodocs'],
} satisfies Meta<typeof Progress>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
