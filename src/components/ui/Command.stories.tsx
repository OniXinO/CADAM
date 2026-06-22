import type { Meta, StoryObj } from '@storybook/react';
import { Command } from './command';

const meta = {
  component: Command,
  tags: ['autodocs'],
} satisfies Meta<typeof Command>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
