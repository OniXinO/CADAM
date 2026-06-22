import type { Meta, StoryObj } from '@storybook/react';
import { ColorPicker } from './ColorPicker';

const meta = {
  component: ColorPicker,
  tags: ['autodocs'],
  argTypes: {
    color: { control: 'text' },
  },
} satisfies Meta<typeof ColorPicker>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    color: '#00A6FF',
  },
};
