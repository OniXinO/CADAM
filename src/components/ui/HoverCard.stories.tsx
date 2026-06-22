import type { Meta, StoryObj } from '@storybook/react';
import { HoverCard } from './hover-card';

const meta = {
  component: HoverCard,
  tags: ['autodocs'],
} satisfies Meta<typeof HoverCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
