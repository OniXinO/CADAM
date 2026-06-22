import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './label';

const meta = {
  component: Label,
  tags: ['autodocs'],
} satisfies Meta<typeof Label>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
