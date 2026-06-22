import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './switch';

const meta = {
  component: Switch,
  tags: ['autodocs'],
} satisfies Meta<typeof Switch>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
