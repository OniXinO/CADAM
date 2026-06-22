import type { Meta, StoryObj } from '@storybook/react';
import { Sheet } from './sheet';

const meta = {
  component: Sheet,
  tags: ['autodocs'],
} satisfies Meta<typeof Sheet>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
