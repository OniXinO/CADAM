import type { Meta, StoryObj } from '@storybook/react';
import { Collapsible } from './collapsible';

const meta = {
  component: Collapsible,
  tags: ['autodocs'],
} satisfies Meta<typeof Collapsible>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
