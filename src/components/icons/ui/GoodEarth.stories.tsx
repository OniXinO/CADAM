import type { Meta, StoryObj } from '@storybook/react';
import { GoodEarth } from './GoodEarth';

const meta = {
  component: GoodEarth,
  tags: ['autodocs'],
} satisfies Meta<typeof GoodEarth>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
