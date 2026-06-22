import type { Meta, StoryObj } from '@storybook/react';
import { Menubar } from './menubar';

const meta = {
  component: Menubar,
  tags: ['autodocs'],
} satisfies Meta<typeof Menubar>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
