import type { Meta, StoryObj } from '@storybook/react';
import { CreateIcon } from './CreateIcon';

const meta = {
  component: CreateIcon,
  tags: ['autodocs'],
} satisfies Meta<typeof CreateIcon>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
