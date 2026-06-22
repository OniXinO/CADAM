import type { Meta, StoryObj } from '@storybook/react';
import { RenameDialogDrawer } from './RenameDialogDrawer';

const meta = {
  component: RenameDialogDrawer,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean' },
    newTitle: { control: 'text' },
  },
} satisfies Meta<typeof RenameDialogDrawer>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: false,
    newTitle: 'Decorative Planter Box',
  },
};

export const Open: Story = {
  args: {
    open: true,
    newTitle: 'Decorative Planter Box',
  },
};
