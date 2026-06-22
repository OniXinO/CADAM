import type { Meta, StoryObj } from '@storybook/react';
import { ThreeScene } from './ThreeScene';

const meta = {
  component: ThreeScene,
  tags: ['autodocs'],
  argTypes: {
    color: { control: 'text' },
    isMobile: { control: 'boolean' },
    backgroundColor: { control: 'text' },
  },
} satisfies Meta<typeof ThreeScene>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    color: '#4f46e5',
    isMobile: false,
    backgroundColor: '#2d2d2d',
  },
};
