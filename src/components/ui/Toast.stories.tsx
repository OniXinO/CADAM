import type { Meta, StoryObj } from '@storybook/react';
import { Toast } from './toast';

const meta = {
  component: Toast,
  tags: ['autodocs'],
} satisfies Meta<typeof Toast>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
