import type { Meta, StoryObj } from '@storybook/react';
import { AvatarUpdateDialog } from './AvatarUpdateDialog';

const meta = {
  component: AvatarUpdateDialog,
  tags: ['autodocs'],
} satisfies Meta<typeof AvatarUpdateDialog>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
