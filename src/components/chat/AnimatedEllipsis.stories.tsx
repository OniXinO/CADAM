import type { Meta, StoryObj } from '@storybook/react';
import { AnimatedEllipsis } from './AnimatedEllipsis';

const meta = {
  component: AnimatedEllipsis,
  tags: ['autodocs'],
  argTypes: {
    dotClassName: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof AnimatedEllipsis>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    dotClassName: '',
    size: 'md',
  },
};

export const Md: Story = {
  args: {
    dotClassName: '',
    size: 'md',
  },
};
