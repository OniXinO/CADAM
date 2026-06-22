import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from './tabs';

const meta = {
  component: Tabs,
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
