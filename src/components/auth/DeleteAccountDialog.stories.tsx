import type { Meta, StoryObj } from '@storybook/react';
import { DeleteAccountDialog } from './DeleteAccountDialog';

const meta = {
  component: DeleteAccountDialog,
  tags: ['autodocs'],
} satisfies Meta<typeof DeleteAccountDialog>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fullscreen: Story = {
  parameters: { layout: 'fullscreen' },
};
