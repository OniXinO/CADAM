import type { Meta, StoryObj } from '@storybook/react';
import { Drawer } from './drawer';

const meta = {
  component: Drawer,
  tags: ['autodocs'],
} satisfies Meta<typeof Drawer>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
