import type { Meta, StoryObj } from '@storybook/react';
import { Reasoning } from './reasoning';

const meta = {
  component: Reasoning,
  tags: ['autodocs'],
} satisfies Meta<typeof Reasoning>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
